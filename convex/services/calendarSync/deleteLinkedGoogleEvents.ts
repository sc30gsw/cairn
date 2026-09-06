import { Result } from "better-result";

import type { ActionCtx } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { deleteEvent, isGone } from "../../lib/googleCalendar";
import type { SyncPlan } from "../../lib/validators";

export type DeleteLinkedOutcome = "deleted" | "failed" | "noToken";

export async function deleteLinkedGoogleEvents(
  ctx: ActionCtx,
  ownerId: string,
  plan: NonNullable<SyncPlan>,
): Promise<DeleteLinkedOutcome> {
  const token = await getGoogleAccessToken(ctx, {
    accountId: plan.googleAccountId,
    userId: ownerId,
  });
  if (Result.isError(token)) {
    return "noToken";
  }
  const client = { accessToken: token.value };
  const deletions: Promise<
    Result<undefined, import("../../lib/googleCalendar").GoogleCalendarError>
  >[] = [];
  for (const source of plan.sources) {
    if (source.link !== null) {
      deletions.push(deleteEvent(client, plan.calendarId, source.link.googleEventId));
    }
  }
  const results = await Promise.all(deletions);
  const failed = results.some((result) => Result.isError(result) && !isGone(result.error));
  return failed ? "failed" : "deleted";
}
