import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import {
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_RETRY_DELAYS_MS,
} from "../../lib/calendarSync";

export async function markNeedsReauth(
  ctx: ActionCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<void> {
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
    ownerId,
    connectionId,
    status: "needsReauth",
    syncedAt: null,
  });
}

export async function markSyncError(
  ctx: ActionCtx,
  ownerId: string,
  lastError: string,
  syncedAt: number | null = null,
  connectionId?: Id<"calendarConnections">,
): Promise<void> {
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError,
    ownerId,
    connectionId,
    status: "error",
    syncedAt,
  });
}

export function retryDelayMs(attempt: number): number | undefined {
  return CALENDAR_SYNC_RETRY_DELAYS_MS[attempt];
}

export async function markTokenFailure(
  ctx: ActionCtx,
  ownerId: string,
  error: { message: string; revoked?: boolean },
  connectionId?: Id<"calendarConnections">,
): Promise<"error" | "needsReauth"> {
  if (error.revoked === true) {
    await markNeedsReauth(ctx, ownerId, connectionId);
    return "needsReauth";
  }
  await markSyncError(ctx, ownerId, error.message, null, connectionId);
  return "error";
}
