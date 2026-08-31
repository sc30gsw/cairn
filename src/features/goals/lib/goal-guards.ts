import { TARGET_METRICS, type TargetMetric } from "~domain/domain";

export function isTargetMetric(value: string): value is TargetMetric {
  return TARGET_METRICS.some((metric) => metric === value);
}
