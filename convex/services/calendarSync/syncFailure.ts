import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_RETRY_DELAYS_MS,
} from "../../lib/calendarSync";

//? 送信・同期アクションが失敗をどう記録するかの1箇所。権限切れは needsReauth、それ以外は error + 文言

export async function markNeedsReauth(ctx: ActionCtx, ownerId: string): Promise<void> {
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
    ownerId,
    status: "needsReauth",
    syncedAt: null,
  });
}

export async function markSyncError(
  ctx: ActionCtx,
  ownerId: string,
  lastError: string,
  syncedAt: number | null = null,
): Promise<void> {
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError,
    ownerId,
    status: "error",
    syncedAt,
  });
}

//? 何回目の再試行かで待ち時間を決める。梯子を使い切ったら undefined（諦める）
export function retryDelayMs(attempt: number): number | undefined {
  return CALENDAR_SYNC_RETRY_DELAYS_MS[attempt];
}
