import {
  GOAL_TYPES,
  TARGET_METRICS,
  VOLUME_UNITS,
  type GoalType,
  type TargetMetric,
  type VolumeUnit,
} from "~domain/domain";

//? Select / SegmentedControl は string を返す。ドメイン値かどうかはここで1回だけ確かめる(as を書かない)
export function isGoalType(value: string): value is GoalType {
  return GOAL_TYPES.some((goalType) => goalType === value);
}

export function isVolumeUnit(value: string): value is VolumeUnit {
  return VOLUME_UNITS.some((unit) => unit === value);
}

export function isTargetMetric(value: string): value is TargetMetric {
  return TARGET_METRICS.some((metric) => metric === value);
}
