//* 計測フィールドを消す patch 断片。Convex の patch は undefined でフィールドを削除する。
//? 計測は status === "進行中" のときだけ存在する不変条件を、状態を動かす全経路で守るための一本化
//? (docs/specs/study-timer.md §4.3)。
export function clearTimerFields() {
  return {
    timerAccumulatedMs: undefined,
    timerAutoStoppedAt: undefined,
    timerStartedAt: undefined,
  };
}
