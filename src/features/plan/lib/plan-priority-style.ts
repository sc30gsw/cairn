import { PLAN_PRIORITY_STYLE, type PlanPriority } from "~domain/planEvent";

import type { PlanScheduleColor } from "~/features/plan/types/plan";

export const PLAN_PRIORITY_APP_COLOR = {
  high: "yellow",
  low: "blue",
  medium: "lime",
} as const satisfies Record<PlanPriority, PlanScheduleColor>;

export const PLAN_PRIORITY_OPTIONS = (
  ["high", "medium", "low"] as const satisfies readonly PlanPriority[]
).map((priority) => ({
  hex: PLAN_PRIORITY_STYLE[priority].hex,
  label: PLAN_PRIORITY_STYLE[priority].label,
  value: priority,
}));
