import type { FunctionReturnType } from "convex/server";
import type { PlanPriority } from "~domain/planEvent";

import type { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export type PlanEventDto = FunctionReturnType<
  typeof api.queries.planEvents.listWindow.listWindow
>["page"][number];

export type PlanExternalEvent = FunctionReturnType<
  typeof api.queries.calendarSync.listExternal.listExternal
>[number];

export type PlanCatalogItem = FunctionReturnType<typeof api.queries.items.list.list>[number];

export type PlanTemplateDto = FunctionReturnType<
  typeof api.queries.planTemplates.list.list
>[number];

export type PlanTemplateEventDto = PlanTemplateDto["events"][number];

export type PlanScheduleColor = "gray" | "lime" | "yellow";

export type PlanScheduleBlock = {
  _id: Id<"planEvents">;
  color: PlanScheduleColor;
  endAt: string;
  frozen: boolean;
  itemId?: Id<"items">;
  priority: PlanPriority;
  startAt: string;
  title: string;
};
