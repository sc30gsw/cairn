import type { RowTimerDto } from "./validators";

//* 1区間の上限。これを超えた計測は放置と見なして自動停止する(docs/specs/study-timer.md §10)。
//? 「4時間続けて1件の記録に取り組む」は現実の上限で、それ以上は寝落ち・閉じ忘れの側が確率的に高い。
export const TIMER_MAX_SEGMENT_MS = 4 * 60 * 60 * 1000;

export const TIMER_AUTO_STOP_MINUTES = TIMER_MAX_SEGMENT_MS / 60_000;

export type TimerRunState = "一時停止" | "計測なし" | "計測中";

//* 計測の副状態は保存フィールドからの派生値。UI で startedAt を直接読まないための一本化。
export function timerRunState(timer: RowTimerDto | null): TimerRunState {
  if (timer === null) {
    return "計測なし";
  }
  if (timer.startedAt !== null) {
    return "計測中";
  }
  return timer.accumulatedMs > 0 ? "一時停止" : "計測なし";
}

//* 走っている区間の経過。負(時計のずれ)は0に、上限超過は上限に丸める。
export function segmentElapsedMs(startedAt: number, nowMs: number): number {
  const raw = nowMs - startedAt;
  if (raw <= 0) {
    return 0;
  }
  return Math.min(raw, TIMER_MAX_SEGMENT_MS);
}

export function isSegmentExpired(startedAt: number, nowMs: number): boolean {
  return nowMs - startedAt >= TIMER_MAX_SEGMENT_MS;
}

//* 表示・プレフィルに使う「いままでの計測合計」。
export function measuredMs(timer: RowTimerDto | null, nowMs: number): number {
  if (timer === null) {
    return 0;
  }
  if (timer.startedAt === null) {
    return timer.accumulatedMs;
  }
  return timer.accumulatedMs + segmentElapsedMs(timer.startedAt, nowMs);
}

//* 計測 ms → 記録の分数。学習量は整数分の合計なので、ここで整数に落とす。
//? 30秒でも「やった」を0分にしない。1ms でも測ったら最低1分。
export function timerMinutes(ms: number): number {
  if (ms <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

export function hasTimerState(timer: RowTimerDto | null): boolean {
  return timer !== null && (timer.startedAt !== null || timer.accumulatedMs > 0);
}
