import type { PlanPriority } from "~domain/planEvent";

import type { PlanCatalogItem } from "~/features/plan/types/plan";

export function planEventDisplayName(
  title: string,
  itemId: string | undefined,
  items: readonly PlanCatalogItem[],
): string {
  if (itemId !== undefined) {
    const item = items.find((entry) => entry._id === itemId);
    if (item !== undefined) {
      return item.name;
    }
  }
  return title;
}

export type PlanDayScheduleEntry = {
  draft?: boolean;
  endTime: string;
  external?: boolean;
  key: string;
  name: string;
  priority?: PlanPriority;
  startTime: string;
};
