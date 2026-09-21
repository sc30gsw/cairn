import { planEventDisplayName } from "~/features/plan/lib/plan-event-display-name";
import { planTimesToInstants } from "~/features/plan/lib/plan-event-instants";
import { PLAN_PRIORITY_APP_COLOR } from "~/features/plan/lib/plan-priority-style";
import type { PlanCatalogItem, PlanEventDto, PlanScheduleBlock } from "~/features/plan/types/plan";

export function toPlanScheduleBlocks(
  events: readonly PlanEventDto[],
  items: readonly PlanCatalogItem[] = [],
): PlanScheduleBlock[] {
  return events.map((event) => {
    const instants = planTimesToInstants(event.dateJst, event.startTime, event.endTime);
    return {
      _id: event._id,
      color: PLAN_PRIORITY_APP_COLOR[event.priority],
      endAt: instants.endAt,
      frozen: event.recordState.kind === "materialized",
      itemId: event.itemId,
      priority: event.priority,
      startAt: instants.startAt,
      title: planEventDisplayName(event.title, event.itemId, items),
    };
  });
}
