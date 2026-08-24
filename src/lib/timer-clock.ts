//* 計測 ms → 時計の表示。`convex/lib` に UI 文字列を入れないので、整形はここに置く。
export function formatTimerClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours === 0 ? mmss : `${String(hours)}:${mmss}`;
}
