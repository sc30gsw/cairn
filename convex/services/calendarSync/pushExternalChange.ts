import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import {
  deleteEvent,
  type GoogleCalendarClient,
  type GoogleCalendarError,
  isGone,
  isAuthFailure,
  isRetryable,
  patchEvent,
} from "../../lib/googleCalendar";
import { externalChangePayload } from "./eventPayload";
import { retryDelayMs } from "./syncFailure";

export async function pushExternalChange(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  { pendingId, attempt }: { pendingId: Id<"calendarExternalChanges">; attempt: number },
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
    if (!isAuthFailure(outcome.error)) {
      const delay = retryDelayMs(attempt);
      if (isRetryable(outcome.error) && delay !== undefined) {
        await ctx.scheduler.runAfter(
          delay,
          internal.actions.calendarSync.pushExternal.pushExternal,
          {
            pendingId,
            attempt: attempt + 1,
          },
        );
      } else {
        await ctx.runMutation(
          internal.mutations.calendarSync.finishExternalPush.finishExternalPush,
          {
            pendingId,
            lastError: outcome.error.message,
          },
        );
      }
    }
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
  connectionId?: Id<"calendarConnections">,
): Promise<Result<null, GoogleCalendarError>> {
  let cursor: string | null = null;
  let firstError: GoogleCalendarError | null = null;
  while (true) {
    const pending: FunctionReturnType<
      typeof internal.queries.calendarSync.pendingExternalChanges.pendingExternalChanges
    > = await ctx.runQuery(
      internal.queries.calendarSync.pendingExternalChanges.pendingExternalChanges,
      { ownerId, connectionId, paginationOpts: { cursor, numItems: 100 } },
    );
    for (const pendingId of pending.page) {
      const result = await pushExternalChange(ctx, client, { pendingId, attempt: 0 });
      if (Result.isError(result)) {
        if (isAuthFailure(result.error)) return result;
        firstError ??= result.error;
      }
    }
    if (pending.isDone) {
      return firstError === null ? Result.ok(null) : Result.err(firstError);
    }
    cursor = pending.continueCursor;
  }
}
