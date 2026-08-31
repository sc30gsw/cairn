import { TARGET_METRIC_UNITS, TARGET_METRICS, type TargetMetric } from "~domain/domain";

export const TARGET_METRIC_LABELS = {
  count: "件数",
  days: "実施日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;

export { TARGET_METRIC_UNITS };

export const TARGET_METRIC_SEGMENTS = TARGET_METRICS.map((metric) => ({
  label: TARGET_METRIC_LABELS[metric],
  value: metric,
}));
