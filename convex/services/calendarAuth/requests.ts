import { Result } from "better-result";

import { components, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ForbiddenError, ValidationFailedError } from "../../lib/errors";

const REQUEST_LIFETIME_MS = 10 * 60 * 1000;
const CALENDAR_LIST_SCOPE = "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const READ_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const READ_SCOPES = [CALENDAR_LIST_SCOPE, READ_EVENTS_SCOPE];
const WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function findGoogleAccount(ctx: Pick<QueryCtx, "runQuery">, googleAccountId: string) {
  const account: unknown = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "account",
    where: [
      { field: "providerId", value: "google" },
      { field: "accountId", value: googleAccountId },
    ],
  });
  if (
    account === null ||
    typeof account !== "object" ||
    !("userId" in account) ||
    typeof account.userId !== "string"
  ) {
    return null;
  }
  return {
    scope: "scope" in account && typeof account.scope === "string" ? account.scope : "",
    userId: account.userId,
  };
}

export async function beginRequest(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    calendarId?: string;
    googleAccountId?: string;
    purpose: "read" | "write";
  },
): Promise<
  Result<
    {
      requestId: Id<"calendarAuthorizationRequests">;
      scopes: string[];
    },
    ForbiddenError | ValidationFailedError
  >
> {
  if (args.purpose === "write" && !args.googleAccountId) {
    return Result.err(
      new ValidationFailedError({ message: "再接続する Google アカウントを選んでください。" }),
    );
  }
  if (args.googleAccountId) {
    const account = await findGoogleAccount(ctx, args.googleAccountId);
    if (account?.userId !== ownerId) {
      return Result.err(
        new ForbiddenError({ message: "この Google アカウントは再接続できません。" }),
      );
    }
  }
  const expiresAt = Date.now() + REQUEST_LIFETIME_MS;
  const requestId = await ctx.db.insert("calendarAuthorizationRequests", {
    ...args,
    expectedGoogleAccountId: args.googleAccountId,
    expiresAt,
    googleAccountId: undefined,
    ownerId,
    state: "pending",
  });
  await ctx.scheduler.runAt(expiresAt, internal.mutations.calendarAuth.expire.expire, {
    requestId,
  });
  return Result.ok({
    requestId,
    scopes: args.purpose === "write" ? [...READ_SCOPES, WRITE_SCOPE] : READ_SCOPES,
  });
}

export async function authorizeRequest(
  ctx: MutationCtx,
  args: { googleAccountId: string; ownerId: string; requestId: string },
): Promise<boolean> {
  const requestId = ctx.db.normalizeId("calendarAuthorizationRequests", args.requestId);
  if (!requestId) {
    return false;
  }
  const request = await ctx.db.get("calendarAuthorizationRequests", requestId);
  if (
    !request ||
    request.ownerId !== args.ownerId ||
    request.expiresAt <= Date.now() ||
    request.state !== "pending" ||
    (request.expectedGoogleAccountId && request.expectedGoogleAccountId !== args.googleAccountId)
  ) {
    return false;
  }
  const [existingAccount, identity] = await Promise.all([
    findGoogleAccount(ctx, args.googleAccountId),
    ctx.db
      .query("googleCalendarIdentities")
      .withIndex("by_googleAccountId", (q) => q.eq("googleAccountId", args.googleAccountId))
      .unique(),
  ]);
  if (
    (existingAccount && existingAccount.userId !== args.ownerId) ||
    (identity && identity.ownerId !== args.ownerId)
  ) {
    return false;
  }
  if (!identity) {
    await ctx.db.insert("googleCalendarIdentities", {
      googleAccountId: args.googleAccountId,
      ownerId: args.ownerId,
      signInAllowed: existingAccount !== null,
    });
  }
  await ctx.db.patch("calendarAuthorizationRequests", requestId, {
    googleAccountId: args.googleAccountId,
    state: "authorized",
  });
  return true;
}

export async function consumeRequest(
  ctx: MutationCtx,
  ownerId: string,
  requestId: Id<"calendarAuthorizationRequests">,
) {
  const request = await ctx.db.get("calendarAuthorizationRequests", requestId);
  if (
    !request ||
    request.ownerId !== ownerId ||
    request.expiresAt <= Date.now() ||
    request.state !== "authorized" ||
    !request.googleAccountId
  ) {
    return Result.err(
      new ForbiddenError({
        message: "Google 連携の確認ができませんでした。連携をやり直してください。",
      }),
    );
  }
  const account = await findGoogleAccount(ctx, request.googleAccountId);
  const scopes = new Set(account?.scope.split(/[ ,]+/) ?? []);
  const canRead =
    scopes.has(CALENDAR_LIST_SCOPE) && (scopes.has(READ_EVENTS_SCOPE) || scopes.has(WRITE_SCOPE));
  if (
    account?.userId !== ownerId ||
    !canRead ||
    (request.purpose === "write" && !scopes.has(WRITE_SCOPE))
  ) {
    return Result.err(
      new ForbiddenError({
        message: "カレンダーの権限が不足しています。連携をやり直してください。",
      }),
    );
  }
  await ctx.db.patch("calendarAuthorizationRequests", requestId, { state: "consumed" });
  return Result.ok({
    calendarId: request.calendarId,
    googleAccountId: request.googleAccountId,
    purpose: request.purpose,
  });
}
