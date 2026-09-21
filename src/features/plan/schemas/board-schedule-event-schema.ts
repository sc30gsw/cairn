import * as v from "valibot";
import { PLAN_PRIORITIES, PLAN_TITLE_MESSAGE, type PlanPriority } from "~domain/planEvent";

import type { PlanCatalogItem, PlanScheduleBlock } from "~/features/plan/types/plan";

export { PLAN_PRIORITIES, type PlanPriority };

const EventIdSchema = v.custom<PlanScheduleBlock["_id"]>(
  (value) => typeof value === "string" && value.length > 0,
);

const ItemIdSchema = v.custom<PlanCatalogItem["_id"]>(
  (value) => typeof value === "string" && value.length > 0,
);

export const PlanScheduleEventSchema = v.pipe(
  v.object({
    end: v.date(),
    eventId: v.optional(EventIdSchema),
    itemId: v.optional(ItemIdSchema),
    priority: v.picklist(PLAN_PRIORITIES),
    start: v.date(),
    title: v.pipe(v.string(), v.trim()),
  }),
  v.forward(
    v.partialCheck(
      [["start"], ["end"]],
      (input) => input.end.getTime() > input.start.getTime(),
      "終了は開始より後にしてください",
    ),
    ["end"],
  ),
  v.forward(
    v.partialCheck(
      [["itemId"], ["title"]],
      (input) => input.itemId !== undefined || input.title.length > 0,
      PLAN_TITLE_MESSAGE,
    ),
    ["title"],
  ),
);

export type PlanScheduleEventInput = v.InferInput<typeof PlanScheduleEventSchema>;
export type PlanScheduleEventOutput = v.InferOutput<typeof PlanScheduleEventSchema>;
