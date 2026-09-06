import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import {
  deleteEvent,
  type GoogleCalendarClient,
  type GoogleCalendarError,
  isGone,
  patchEvent,
} from "../../lib/googleCalendar";
import { externalChangePayload } from "./eventPayload";

export async function pushExternalChange(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  pendingId: Id<"calendarExternalChanges">,
): Promise<Result<null, GoogleCalendarError>> {
  const pending = await ctx.runQuery(
    internal.queries.calendarSync.pendingExternalChange.pendingExternalChange,
    { pendingId },
  );
  if (pending === null) {
    return Result.ok(null);
  }
  const outcome =
    pending.change.kind === "delete"
      ? await deleteEvent(client, pending.calendarId, pending.googleEventId)
      : await patchEvent(
          client,
          pending.calendarId,
          pending.googleEventId,
          externalChangePayload(pending.change),
        );
  if (Result.isError(outcome) && !isGone(outcome.error)) {
    return outcome;
  }
  await ctx.runMutation(internal.mutations.calendarSync.finishExternalPush.finishExternalPush, {
    pendingId,
  });
  return Result.ok(null);
}

export async function flushExternalChanges(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  ownerId: string,
): Promise<Result<null, GoogleCalendarError>> {
  while (true) {
    const pending = await ctx.runQuery(
      internal.queries.calendarSync.pendingExternalChange.pendingExternalChanges,
      { ownerId },
    );
    if (pending.length === 0) {
      return Result.ok(null);
    }
    for (const pendingId of pending) {
      const result = await pushExternalChange(ctx, client, pendingId);
      if (Result.isError(result)) {
        return result;
      }
    }
  }
}
