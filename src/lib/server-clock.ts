import { tryLocalStorageGet, tryLocalStorageSet } from "~/lib/safe-storage";

export const SERVER_CLOCK_OFFSET_KEY = "cairn:timer:clock-offset-ms";

//? 常識外れのオフセットは端末の時計より保存値の壊れを疑う。1日を超える補正は捨てる。
const MAX_OFFSET_MS = 24 * 60 * 60 * 1000;

export function readOffsetMs(): number {
  const raw = tryLocalStorageGet(SERVER_CLOCK_OFFSET_KEY);
  if (raw === null) {
    return 0;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_OFFSET_MS) {
    return 0;
  }
  return parsed;
}

//* サーバ時刻 − 端末時刻で補正した「いま」。記録される分数はサーバが決めるので、これは表示専用
//* (docs/specs/study-timer.md §8.3)。
export function serverNowMs(): number {
  return Date.now() + readOffsetMs();
}

//* サーバ由来の時刻(query が返した timerStartedAt)を見たときにオフセットを合わせ直す。
//? 往復のぶんだけサーバ側が「未来」に見えるので、片道は無視して下限だけ補正する。専用の
//? 「時刻を返す関数」は公開サーフェスに増やさない(§17-7)。
export function recordServerInstant(serverMs: number, localBeforeMs: number): void {
  const offset = serverMs - localBeforeMs;
  if (!Number.isFinite(offset) || offset > MAX_OFFSET_MS || offset <= readOffsetMs()) {
    return;
  }
  tryLocalStorageSet(SERVER_CLOCK_OFFSET_KEY, String(offset));
}
