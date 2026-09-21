import * as v from "valibot";
import {
  PLAN_PRIORITIES,
  PLAN_TEMPLATE_NAME_MESSAGE,
  PLAN_TIME_MESSAGE,
  PLAN_TITLE_MESSAGE,
  PLAN_WINDOW_MESSAGE,
} from "~domain/planEvent";

export const NONE_ITEM_VALUE = "none";

const StartTimeSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, PLAN_TIME_MESSAGE),
);

const EndTimeSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, PLAN_TIME_MESSAGE),
);

export const PlanTemplateEventFormSchema = v.pipe(
  v.object({
    endTime: EndTimeSchema,
    itemId: v.pipe(v.string(), v.nonEmpty()),
    priority: v.picklist(PLAN_PRIORITIES),
    startTime: StartTimeSchema,
    templateEventId: v.optional(v.string()),
    title: v.pipe(v.string(), v.trim(), v.nonEmpty(PLAN_TITLE_MESSAGE)),
  }),
  v.forward(
    v.partialCheck(
      [["startTime"], ["endTime"]],
      (input) => input.startTime < input.endTime,
      PLAN_WINDOW_MESSAGE,
    ),
    ["endTime"],
  ),
);

export const PlanTemplateFormSchema = v.object({
  events: v.array(PlanTemplateEventFormSchema),
  name: v.pipe(v.string(), v.trim(), v.nonEmpty(PLAN_TEMPLATE_NAME_MESSAGE)),
});

export type PlanTemplateEventFormInput = v.InferInput<typeof PlanTemplateEventFormSchema>;
export type PlanTemplateFormInput = v.InferInput<typeof PlanTemplateFormSchema>;
export type PlanTemplateFormOutput = v.InferOutput<typeof PlanTemplateFormSchema>;

export const EMPTY_TEMPLATE_EVENT: PlanTemplateEventFormInput = {
  endTime: "10:00",
  itemId: NONE_ITEM_VALUE,
  priority: "medium",
  startTime: "09:00",
  title: "",
};
