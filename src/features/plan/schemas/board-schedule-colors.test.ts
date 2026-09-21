import { expect, test } from "vite-plus/test";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import { boardScheduleColorCss } from "~/features/plan/lib/board-schedule-color-ui";
import { PLAN_PRIORITY_APP_COLOR } from "~/features/plan/lib/plan-priority-style";

test("予定の色は Banana / Sage / Blueberry だけ", () => {
  expect(PLAN_PRIORITY_APP_COLOR).toEqual({
    high: "yellow",
    low: "blue",
    medium: "lime",
  });
  expect(boardScheduleColorCss("yellow")).toBe(PLAN_PRIORITY_STYLE.high.hex);
  expect(boardScheduleColorCss("lime")).toBe(PLAN_PRIORITY_STYLE.medium.hex);
  expect(boardScheduleColorCss("blue")).toBe(PLAN_PRIORITY_STYLE.low.hex);
});
