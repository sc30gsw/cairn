import type { Condition } from "~domain/conditions";

export type MonthDayOverlayStats = {
  condition: Condition | null;
  minutes: number;
  movingAverage: number;
};

export function monthDayOverlayAttrs(stats: MonthDayOverlayStats | undefined): {
  "data-avg"?: string;
  "data-condition"?: Condition;
  "data-volume"?: string;
} {
  if (stats === undefined) {
    return {};
  }

  return {
    ...(stats.minutes > 0
      ? {
          "data-avg": String(Math.round(stats.movingAverage)),
          "data-volume": String(stats.minutes),
        }
      : {}),
    ...(stats.condition === null ? {} : { "data-condition": stats.condition }),
  };
}
