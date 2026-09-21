import { expect, test } from "vite-plus/test";

import { derivePlanView, scheduleAnchorDateJst } from "~/features/plan/hooks/use-plan-view";

test("derivePlanView は未指定時に今日の日表示とプランタブにする", () => {
  const view = derivePlanView({}, "2026-08-17");
  expect(view.tab).toBe("plan");
  expect(view.scheduleView).toBe("day");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.yearMonth).toBe("2026-08");
  expect(view.weekAnchor).toBe("2026-08-17");
  expect(view.scheduleAnchor).toBe("2026-08-17");
});

test("derivePlanView は今日+7日以内の未来日をそのまま選べる", () => {
  const view = derivePlanView({ date: "2026-08-20", month: "2026-08" }, "2026-08-17");
  expect(view.selectedDateJst).toBe("2026-08-20");
  expect(view.yearMonth).toBe("2026-08");
});

test("derivePlanView は今日+8日以降の日付を上限に丸める", () => {
  const view = derivePlanView({ date: "2026-09-25", month: "2026-09" }, "2026-08-17");
  expect(view.selectedDateJst).toBe("2026-08-24");
  expect(view.yearMonth).toBe("2026-09");
});

test("derivePlanView は search を優先する", () => {
  const view = derivePlanView(
    {
      date: "2026-08-20",
      month: "2026-07",
      tab: "plan",
      view: "month",
      week: "2026-07-28",
    },
    "2026-08-17",
  );
  expect(view.tab).toBe("plan");
  expect(view.scheduleView).toBe("month");
  expect(view.selectedDateJst).toBe("2026-08-20");
  expect(view.yearMonth).toBe("2026-07");
  expect(view.weekAnchor).toBe("2026-07-28");
  expect(view.scheduleAnchor).toBe("2026-07-01");
});

test("scheduleAnchorDateJst は view ごとに anchor を決める", () => {
  expect(scheduleAnchorDateJst("day", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-08-05");
  expect(scheduleAnchorDateJst("week", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-08-04");
  expect(scheduleAnchorDateJst("month", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-07-01");
  expect(scheduleAnchorDateJst("year", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-01-01");
});
