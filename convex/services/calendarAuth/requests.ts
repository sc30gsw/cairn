import { Result } from "better-result";
import * as v from "valibot";

import { components, internal } from "../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  GOOGLE_CALENDAR_READ_SCOPES,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_CALENDAR_WRITE_SCOPES,
} from "../../lib/calendarSync";
import { ForbiddenError, ValidationFailedError } from "../../lib/errors";
import type { CalendarAuthBeginArgs, CalendarAuthBeginResult } from "../../lib/validators";

const REQUEST_LIFETIME_MS = 10 * 60 * 1000;

const googleAccountRow = v.object({
  scope: v.nullish(v.string(), ""),
  userId: v.string(),
});

export async function findGoogleAccount(ctx: Pick<QueryCtx, "runQuery">, googleAccountId: string) {
  const account: unknown = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "account",
    where: [
      { field: "providerId", value: "google" },
      { field: "accountId", value: googleAccountId },
    ],
  });
  const parsed = v.safeParse(googleAccountRow, account);
  return parsed.success ? parsed.output : null;
}

export async function beginRequest(
  ctx: MutationCtx,
  ownerId: string,
  args: CalendarAuthBeginArgs,
): Promise<Result<CalendarAuthBeginResult, ForbiddenError | ValidationFailedError>> {
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
    calendarId: args.calendarId,
    expectedGoogleAccountId: args.googleAccountId,
    expiresAt,
    ownerId,
    purpose: args.purpose,
    state: "pending",
  });
  await ctx.scheduler.runAt(expiresAt, internal.mutations.calendarAuth.expire.expire, {
    requestId,
  });
  return Result.ok({
    requestId,
    scopes:
      args.purpose === "write"
        ? [...GOOGLE_CALENDAR_WRITE_SCOPES]
        : [...GOOGLE_CALENDAR_READ_SCOPES],
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
    //? Better Auth が account を保存する前に呼ばれる。既存 account が無い subject は
    //? カレンダー専用として記録し、以後どの経路でも Cairn へのログインに使わせない（ADR-0019）
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

const REQUEST_UNVERIFIED = "Google 連携の確認ができませんでした。連携をやり直してください。";

export async function consumeRequest(ctx: MutationCtx, ownerId: string, rawRequestId: string) {
  const requestId = ctx.db.normalizeId("calendarAuthorizationRequests", rawRequestId);
  const request =
    requestId === null ? null : await ctx.db.get("calendarAuthorizationRequests", requestId);
  if (
    requestId === null ||
    !request ||
    request.ownerId !== ownerId ||
    request.expiresAt <= Date.now() ||
    request.state !== "authorized" ||
    !request.googleAccountId
  ) {
    return Result.err(new ForbiddenError({ message: REQUEST_UNVERIFIED }));
  }
  const account = await findGoogleAccount(ctx, request.googleAccountId);
  const scopes = new Set(account?.scope.split(/[ ,]+/) ?? []);
  const canRead =
    scopes.has(GOOGLE_CALENDAR_SCOPE.calendarList) &&
    (scopes.has(GOOGLE_CALENDAR_SCOPE.readEvents) || scopes.has(GOOGLE_CALENDAR_SCOPE.writeEvents));
  if (
    account?.userId !== ownerId ||
    !canRead ||
    (request.purpose === "write" && !scopes.has(GOOGLE_CALENDAR_SCOPE.writeEvents))
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
