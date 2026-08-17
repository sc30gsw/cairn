import { TARGET_METRICS, type TargetMetric } from "~domain/domain";

//? 値の SSoT は ~domain/domain。ここが持つのは表示だけ(CVX-16)
export const TARGET_METRIC_LABELS = {
  count: "件数",
  days: "実施日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;

//? 進捗の「3 / 5 日」のように数値へ添える単位。計器名(実施日)とは別語になる
export const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;

export const TARGET_METRIC_SEGMENTS = TARGET_METRICS.map((metric) => ({
  label: TARGET_METRIC_LABELS[metric],
  value: metric,
}));
