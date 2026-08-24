import { TARGET_METRICS, type TargetMetric } from "~domain/domain";

//? SegmentedControl は string を返す。ドメイン値かどうかはここで1回だけ確かめる(as を書かない)
export function isTargetMetric(value: string): value is TargetMetric {
  return TARGET_METRICS.some((metric) => metric === value);
}
