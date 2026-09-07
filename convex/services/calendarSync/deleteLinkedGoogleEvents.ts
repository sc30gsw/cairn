import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { deleteEvent, isAuthFailure, isGone } from "../../lib/googleCalendar";
import type { SyncPlan } from "../../lib/validators";

export type DeleteLinkedOutcome = "deleted" | "failed" | "noToken";

type LinkedPage = FunctionReturnType<typeof internal.queries.calendarSync.linkedPage.linkedPage>;

export async function deleteLinkedGoogleEvents(
  ctx: ActionCtx,
  ownerId: string,
  plan: Pick<NonNullable<SyncPlan>, "connectionId" | "googleAccountId">,
): Promise<DeleteLinkedOutcome> {
  let cursor: string | null = null;
  while (true) {
    const page: LinkedPage = await ctx.runQuery(
      internal.queries.calendarSync.linkedPage.linkedPage,
      {
        ownerId,
        connectionId: plan.connectionId,
        paginationOpts: { cursor, numItems: 100 },
      },
    );
    if (page.page.length === 0) {
      if (page.isDone) return "deleted";
      cursor = page.continueCursor;
      continue;
    }
    const token = await getGoogleAccessToken(ctx, {
      accountId: plan.googleAccountId,
      userId: ownerId,
    });
    if (Result.isError(token)) return token.error.revoked === true ? "noToken" : "failed";
    const results = await Promise.all(
      page.page.map((link) =>
        deleteEvent({ accessToken: token.value }, link.calendarId, link.googleEventId),
      ),
    );
    if (results.some((result) => Result.isError(result) && isAuthFailure(result.error)))
      return "noToken";
    if (results.some((result) => Result.isError(result) && !isGone(result.error))) return "failed";
    if (page.isDone) return "deleted";
    cursor = page.continueCursor;
  }
}
