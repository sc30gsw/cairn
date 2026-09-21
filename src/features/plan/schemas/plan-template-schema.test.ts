import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import { PLAN_TITLE_MESSAGE } from "~domain/planEvent";

import {
  NONE_ITEM_VALUE,
  PlanTemplateEventFormSchema,
} from "~/features/plan/schemas/plan-template-schema";

test("項目ありならタイトル空でも通る", () => {
  const result = v.safeParse(PlanTemplateEventFormSchema, {
    endTime: "10:00",
    itemId: "item-1",
    priority: "medium",
    startTime: "09:00",
    title: "",
  });
  expect(result.success).toBe(true);
});

test("項目なしならタイトル必須", () => {
  const result = v.safeParse(PlanTemplateEventFormSchema, {
    endTime: "10:00",
    itemId: NONE_ITEM_VALUE,
    priority: "medium",
    startTime: "09:00",
    title: "   ",
  });
  expect(result.success).toBe(false);
  expect(result.issues?.[0]?.message).toBe(PLAN_TITLE_MESSAGE);
});
