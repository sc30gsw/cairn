import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { PlanSearchSchema } from "~/features/plan/schemas/plan-search-schema";

test("PlanSearchSchema は未来の日付を受け入れる", () => {
  expect(v.safeParse(PlanSearchSchema, { date: "2026-09-25", month: "2026-09" }).success).toBe(
    true,
  );
});

test("PlanSearchSchema は plan と schedule を受け入れる", () => {
  expect(v.safeParse(PlanSearchSchema, { tab: "plan" }).success).toBe(true);
  expect(v.safeParse(PlanSearchSchema, { tab: "schedule", view: "day" }).success).toBe(true);
});
