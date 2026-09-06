import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE } from "../../lib/calendarSync";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import {
  type GoogleCalendarClient,
  GoogleCalendarError,
  isAuthFailure,
} from "../../lib/googleCalendar";
import { todayJst } from "../../lib/jst";
import type { PulledEvent } from "../../lib/validators";
import { pullCalendar } from "./pullCalendar";
import { pushOne } from "./pushOne";
import { syncWindow } from "./window";

const APPLY_CHUNK_SIZE = 200;

export type OwnerSyncOutcome = "error" | "needsReauth" | "notConnected" | "ok";

async function mark(
  ctx: ActionCtx,
  ownerId: string,
  status: "error" | "needsReauth" | "ok",
  lastError: string | null,
  syncedAt: number | null,
): Promise<void> {
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError,
    ownerId,
    status,
    syncedAt,
  });
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

//? 1所有者の全件突き合わせ: (1) 表示カレンダーを Google から取り込む → (2) 目標・予定を Google に合わせる。
//? 取り込みを先にするのは、Google 側の変更を戻したうえで送るため（Q10 の「後の更新が勝つ」）
export async function runOwnerSync(ctx: ActionCtx, ownerId: string): Promise<OwnerSyncOutcome> {
  const today = todayJst();
  const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: today,
  });
  if (plan === null) {
    return "notConnected";
  }
  const token = await getGoogleAccessToken(ctx, {
    accountId: plan.accessAccountId,
    userId: ownerId,
  });
  if (Result.isError(token)) {
    await mark(ctx, ownerId, "needsReauth", CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE, null);
    return "needsReauth";
  }
  const client: GoogleCalendarClient = { accessToken: token.value };
  const window = syncWindow(today);
  const failures: GoogleCalendarError[] = [];

  const cursorByCalendar = new Map(
    plan.cursors.map((entry) => [entry.calendarId, entry.syncToken]),
  );
  for (const calendarId of plan.visibleCalendarIds) {
    const cursor = cursorByCalendar.get(calendarId) ?? null;
    const pulled = await pullCalendar(client, { calendarId, syncToken: cursor, window });
    if (Result.isError(pulled)) {
      if (isAuthFailure(pulled.error)) {
        await mark(ctx, ownerId, "needsReauth", CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE, null);
        return "needsReauth";
      }
      failures.push(pulled.error);
      continue;
    }
    //? 同じ予定の差分が複数の塊に跨ることがあるので、塊は到着順に1つずつ写す（並列にしない）
    for (const events of chunk<PulledEvent>(pulled.value.events, APPLY_CHUNK_SIZE)) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop
      await ctx.runMutation(internal.mutations.calendarSync.applyPull.applyPull, {
        calendarId,
        events,
        ownerId,
        todayJst: today,
      });
    }
    await ctx.runMutation(internal.mutations.calendarSync.finishCalendarPull.finishCalendarPull, {
      calendarId,
      keepEventIds: pulled.value.keepEventIds,
      ownerId,
      syncToken: pulled.value.syncToken,
      todayJst: today,
    });
  }

  const refreshed = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: today,
  });
  if (refreshed === null) {
    return "notConnected";
  }
  for (const source of refreshed.sources) {
    const pushed = await pushOne(ctx, client, {
      calendarId: refreshed.calendarId,
      ownerId,
      source,
    });
    if (Result.isError(pushed)) {
      if (isAuthFailure(pushed.error)) {
        await mark(ctx, ownerId, "needsReauth", CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE, null);
        return "needsReauth";
      }
      failures.push(pushed.error);
    }
  }

  const now = Date.now();
  if (failures.length > 0) {
    const [first] = failures;
    await mark(ctx, ownerId, "error", first?.message ?? "同期に失敗しました", now);
    return "error";
  }
  await mark(ctx, ownerId, "ok", null, now);
  return "ok";
}
