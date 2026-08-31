import type { Doc } from "../../_generated/dataModel";
import type { RowTimerDto } from "../../lib/validators";

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
