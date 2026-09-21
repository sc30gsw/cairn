import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { PlanScheduleView } from "~/features/plan/schemas/plan-search-schema";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

export const PLAN_WINDOW_PAGINATION = {
  cursor: null,
  numItems: 256,
} as const;

export function planWindowQuery(anchorDateJst: DateJst, view: PlanScheduleView) {
  return convexQuery(api.queries.planEvents.listWindow.listWindow, {
    anchorDateJst,
    paginationOpts: PLAN_WINDOW_PAGINATION,
    view,
  });
}

export function usePlanWindow(anchorDateJst: DateJst, view: PlanScheduleView) {
  const { data } = useSuspenseQuery(parallelConvexQuery(planWindowQuery(anchorDateJst, view)));
  return {
    appliedTemplateId: data.appliedTemplateId,
    events: data.page,
    isDone: data.isDone,
    unplannedConfirmedMinutes: data.unplannedConfirmedMinutes,
  };
}
