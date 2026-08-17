import { GOAL_TYPES, TARGET_METRICS, type GoalType, type TargetMetric } from "~domain/domain";

//? Select / SegmentedControl は string を返す。ドメイン値かどうかはここで1回だけ確かめる(as を書かない)
export function isGoalType(value: string): value is GoalType {
  return GOAL_TYPES.some((goalType) => goalType === value);
}

export function isTargetMetric(value: string): value is TargetMetric {
  return TARGET_METRICS.some((metric) => metric === value);
}
