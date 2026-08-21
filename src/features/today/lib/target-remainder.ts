import type { TargetProgress } from "~/features/today/types/targets";

//? 目標 feature のラベルは跨げない。単位の3語だけここで持つ
const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const;

export type TargetRemainder = {
  achieved: boolean;
  categoryName: string;
  remaining: number;
  unit: string;
};

export function targetRemainder(
  targets: readonly TargetProgress[],
  categoryName: string,
): TargetRemainder | null {
  const target = targets.find((entry) => entry.categoryName === categoryName);
  if (target === undefined) {
    return null;
  }

  const remaining = Math.max(0, target.targetValue - target.current);
  return {
    achieved: target.achieved || remaining === 0,
    categoryName: target.categoryName,
    remaining,
    unit: TARGET_METRIC_UNITS[target.metric],
  };
}

export function targetRemainderMessage(remainder: TargetRemainder): string {
  if (remainder.achieved) {
    return `${remainder.categoryName} 今週の週間ターゲット 達成`;
  }

  return `${remainder.categoryName} 今週の週間ターゲット あと${remainder.remaining}${remainder.unit}`;
}
