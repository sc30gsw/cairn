import { expect, test } from "vite-plus/test";
import { BOARD_SCHEDULE_VIEWS } from "~domain/boardScheduleRange";

import type { PlanScheduleView } from "~/features/plan/schemas/plan-search-schema";

test("plan schedule views are defined once in domain", () => {
  const clientViews: PlanScheduleView[] = ["day", "week", "month", "year"];
  expect([...clientViews]).toEqual([...BOARD_SCHEDULE_VIEWS]);
});
