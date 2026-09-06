import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { CALENDAR_SYNC_FULL_RESYNC_DAYS } from "../../lib/calendarSync";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import {
  type GoogleCalendarClient,
  GoogleCalendarError,
  isAuthFailure,
} from "../../lib/googleCalendar";
import { daysUntil, todayJst } from "../../lib/jst";
import type { OwnerSyncOutcome, PulledEvent } from "../../lib/validators";
import { pullCalendar } from "./pullCalendar";
import { pushOne } from "./pushOne";
import { markNeedsReauth, markSyncError } from "./syncFailure";
import { syncWindow } from "./window";

const APPLY_CHUNK_SIZE = 200;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

//? 1所有者の全件突き合わせ: (1) 表示カレンダー + メインを Google から取り込む → (2) 目標・予定を Google に合わせる。
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
    accountId: plan.googleAccountId,
    userId: ownerId,
  });
  if (Result.isError(token)) {
    await markNeedsReauth(ctx, ownerId);
    return "needsReauth";
  }
  const client: GoogleCalendarClient = { accessToken: token.value };
  const window = syncWindow(today);
  const failures: GoogleCalendarError[] = [];

  const cursorByCalendar = new Map(plan.cursors.map((entry) => [entry.calendarId, entry]));
  //? 書き込み先（メイン）は表示から外されていても取り込む。Google 側の移動・削除を戻すため（Q10）
  const pullCalendarIds = new Set([...plan.visibleCalendarIds, plan.calendarId]);
  for (const calendarId of pullCalendarIds) {
    const stored = cursorByCalendar.get(calendarId);
    //? 差分の期間は全件を取った日で固定される。日が進んだら全件を取り直して期間を動かす
    const cursor =
      stored === undefined ||
      daysUntil(stored.fullSyncedOnJst, today) >= CALENDAR_SYNC_FULL_RESYNC_DAYS
        ? null
        : stored.syncToken;
    const pulled = await pullCalendar(client, { calendarId, syncToken: cursor, window });
    if (Result.isError(pulled)) {
      if (isAuthFailure(pulled.error)) {
        await markNeedsReauth(ctx, ownerId);
        return "needsReauth";
      }
      failures.push(pulled.error);
      continue;
    }
    //? 同じ予定の差分が複数の塊に跨ることがあるので、塊は到着順に1つずつ写す（並列にしない）。
    //? 最後の塊に差分トークンの保存と写しの掃除を載せる（塊が無ければ空の1回）
    const chunks = chunk<PulledEvent>(pulled.value.events, APPLY_CHUNK_SIZE);
    const batches = chunks.length === 0 ? [[]] : chunks;
    for (const [index, events] of batches.entries()) {
      const last = index === batches.length - 1;
      // oxlint-disable-next-line react-doctor/async-await-in-loop
      await ctx.runMutation(internal.mutations.calendarSync.applyPull.applyPull, {
        calendarId,
        events,
        finish: last
          ? { keepEventIds: pulled.value.keepEventIds, syncToken: pulled.value.syncToken }
          : null,
        ownerId,
        todayJst: today,
      });
    }
  }

  const refreshed = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: today,
  });
  if (refreshed === null) {
    return "notConnected";
  }
  //? Google のレート制限に配慮して1件ずつ送る
  for (const source of refreshed.sources) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop
    const pushed = await pushOne(ctx, client, {
      calendarId: refreshed.calendarId,
      ownerId,
      source,
    });
    if (Result.isError(pushed)) {
      if (isAuthFailure(pushed.error)) {
        await markNeedsReauth(ctx, ownerId);
        return "needsReauth";
      }
      failures.push(pushed.error);
    }
  }

  const now = Date.now();
  if (failures.length > 0) {
    const [first] = failures;
    await markSyncError(ctx, ownerId, first?.message ?? "同期に失敗しました", now);
    return "error";
  }
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError: null,
    ownerId,
    status: "ok",
    syncedAt: now,
  });
  return "ok";
}
