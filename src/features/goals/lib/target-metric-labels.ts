import { TARGET_METRICS, type TargetMetric } from "~domain/domain";

import { TARGET_METRIC_UNITS } from "~/lib/target-metric-units";

//? 値の SSoT は ~domain/domain。ここが持つのは表示だけ(CVX-16)
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
