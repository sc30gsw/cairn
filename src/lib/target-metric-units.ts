import type { TargetMetric } from "~domain/domain";

export const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;
