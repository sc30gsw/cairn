import { useSyncExternalStore } from "react";
import { addDaysJst, todayJst, type DateJst } from "~domain/jst";

//* JST 0:00 をまたいでも「今日」を1点(モジュールスコープの単一ストア)で持ち直す。
//? CVX-14(クエリは dateJst を引数で受け取る)は不変 — ここが変わるのはクライアントの
//? 「今日」だけで、それを引数として渡す先の useSuspenseQuery(convexQuery(...)) が自動で追従する。
const MIDNIGHT_MARGIN_MS = 2_000;

let currentValue: DateJst = todayJst();
let timeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

//? 次の JST 0:00 までの ms(+マージン)。addDaysJst/Date のタイムゾーン解決に乗るだけで、
//? 独自に UTC オフセットを計算し直さない(jst.ts の実装を再利用)。
//? 1日分+数秒しかないため 2^31-1ms(≈24.8日)という setTimeout の上限には届かず、クランプは不要。
function msUntilNextJstMidnight(): number {
  const nextDateJst = addDaysJst(currentValue, 1);
  const nextMidnightMs = new Date(`${nextDateJst}T00:00:00+09:00`).getTime();
  //? currentValue と実時計が食い違う(テストの todayJst モック等)場合の負値だけ 0 にガードする。
  //? 上限側(2^31-1ms)のクランプは不要 — 本来の値は1日分+マージンしか届かない。
  return Math.max(nextMidnightMs - Date.now() + MIDNIGHT_MARGIN_MS, 0);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function scheduleNextCheck(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(recompute, msUntilNextJstMidnight());
}

//? タイマー発火・visibilitychange・focus のすべてがここに合流する。値が変わったときだけ通知し、
//? 常に次回分をスケジュールし直す(スリープ復帰でずれた次回発火時刻もここで直る)。
function recompute(): void {
  const next = todayJst();
  if (next !== currentValue) {
    currentValue = next;
    notify();
  }
  scheduleNextCheck();
}

function handleWake(): void {
  recompute();
}

function start(): void {
  recompute();
  document.addEventListener("visibilitychange", handleWake);
  window.addEventListener("focus", handleWake);
}

function stop(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  document.removeEventListener("visibilitychange", handleWake);
  window.removeEventListener("focus", handleWake);
}

//? 購読者0人ではタイマー・リスナーを持たない。最初の1人で起動し、最後の1人が抜けたら止める。
function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    start();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
    }
  };
}

function getSnapshot(): DateJst {
  return currentValue;
}

//? SSR では常駐ストアを持てない。リクエストごとに素の todayJst() を返す。
function getServerSnapshot(): DateJst {
  return todayJst();
}

/** JST の「今日」。0:00 の到来と visibilitychange/focus での復帰で自動的に再計算される。 */
export function useTodayJst(): DateJst {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
