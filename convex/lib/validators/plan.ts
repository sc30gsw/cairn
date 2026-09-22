import { type Infer, v } from "convex/values";

import { PLAN_PRIORITIES, PLAN_VIEWS } from "../planEvent";
import { statusValidator } from "./core";

export const planPriorityValidator = v.union(
  ...PLAN_PRIORITIES.map((priority) => v.literal(priority)),
);

export type PlanPriorityDto = Infer<typeof planPriorityValidator>;

export const planViewValidator = v.union(...PLAN_VIEWS.map((view) => v.literal(view)));

export type PlanViewDto = Infer<typeof planViewValidator>;

const planEventBaseValidator = v.object({
  dateJst: v.string(),
  endMinute: v.number(),
  ownerId: v.string(),
  priority: planPriorityValidator,
  sourceTemplateId: v.optional(v.id("planTemplates")),
  startMinute: v.number(),
  title: v.string(),
});

export const planEventDocumentValidator = v.union(
  planEventBaseValidator.extend({
    record: v.object({ kind: v.literal("none") }),
  }),
  planEventBaseValidator.extend({
    record: v.object({
      itemId: v.id("items"),
      kind: v.literal("item"),
      materializedRowId: v.optional(v.id("rows")),
    }),
  }),
);

export const planRecordStateValidator = v.union(
  v.object({ kind: v.literal("not-applicable") }),
  v.object({ kind: v.literal("awaiting-open") }),
  v.object({ kind: v.literal("materialized"), status: statusValidator }),
  v.object({ kind: v.literal("removed") }),
);

export type PlanRecordStateDto = Infer<typeof planRecordStateValidator>;

export const planEventDtoValidator = v.object({
  _id: v.id("planEvents"),
  dateJst: v.string(),
  endTime: v.string(),
  itemId: v.optional(v.id("items")),
  materializedRowId: v.optional(v.id("rows")),
  priority: planPriorityValidator,
  recordState: planRecordStateValidator,
  startTime: v.string(),
  title: v.string(),
});

export type PlanEventDto = Infer<typeof planEventDtoValidator>;

export const planEventDraftValidator = v.object({
  endTime: v.string(),
  eventId: v.optional(v.id("planEvents")),
  itemId: v.optional(v.id("items")),
  priority: planPriorityValidator,
  sourceTemplateId: v.optional(v.id("planTemplates")),
  startTime: v.string(),
  title: v.string(),
});

export type PlanEventDraft = Infer<typeof planEventDraftValidator>;

export const planWindowResultValidator = v.object({
  appliedTemplateId: v.union(v.id("planTemplates"), v.null()),
  continueCursor: v.string(),
  isDone: v.boolean(),
  page: v.array(planEventDtoValidator),
  unplannedConfirmedMinutes: v.number(),
});

export type PlanWindowResult = Infer<typeof planWindowResultValidator>;

const planTemplateEventBaseValidator = v.object({
  endMinute: v.number(),
  ownerId: v.string(),
  priority: planPriorityValidator,
  startMinute: v.number(),
  templateId: v.id("planTemplates"),
  title: v.string(),
});

export const planTemplateEventDocumentValidator = v.union(
  planTemplateEventBaseValidator.extend({
    record: v.object({ kind: v.literal("none") }),
  }),
  planTemplateEventBaseValidator.extend({
    record: v.object({
      itemId: v.id("items"),
      kind: v.literal("item"),
    }),
  }),
);

export const planTemplateEventDraftValidator = v.object({
  endTime: v.string(),
  itemId: v.optional(v.id("items")),
  priority: planPriorityValidator,
  startTime: v.string(),
  templateEventId: v.optional(v.id("planTemplateEvents")),
  title: v.string(),
});

export type PlanTemplateEventDraft = Infer<typeof planTemplateEventDraftValidator>;

export const planTemplateEventDtoValidator = v.object({
  _id: v.id("planTemplateEvents"),
  endTime: v.string(),
  itemId: v.optional(v.id("items")),
  priority: planPriorityValidator,
  startTime: v.string(),
  title: v.string(),
});

export type PlanTemplateEventDto = Infer<typeof planTemplateEventDtoValidator>;

export const planTemplateDtoValidator = v.object({
  _id: v.id("planTemplates"),
  events: v.array(planTemplateEventDtoValidator),
  forgotten: v.boolean(),
  name: v.string(),
});

export type PlanTemplateDto = Infer<typeof planTemplateDtoValidator>;
