import type { Doc } from "../../_generated/dataModel";
import type { RowTimerDto } from "../../lib/validators";

//* 保存フィールド3つ → 入れ子 DTO。計測が一度も無い行は null にして、UI の判定を1項にする。
export function toRowTimerDto(
  row: Pick<Doc<"rows">, "timerAccumulatedMs" | "timerAutoStoppedAt" | "timerStartedAt">,
): RowTimerDto | null {
  if (row.timerStartedAt === undefined && row.timerAccumulatedMs === undefined) {
    return null;
  }
  return {
    accumulatedMs: row.timerAccumulatedMs ?? 0,
    autoStoppedAt: row.timerAutoStoppedAt ?? null,
    startedAt: row.timerStartedAt ?? null,
  };
}
