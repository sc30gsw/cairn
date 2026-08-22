import { expect, test } from "vite-plus/test";

import { deriveBoardView, scheduleAnchorDateJst } from "~/features/board/hooks/use-board-view";

test("deriveBoardView は未指定時に today から補完する", () => {
  const view = deriveBoardView({}, "2026-08-17");
  expect(view.tab).toBe("kanban");
  expect(view.scheduleView).toBe("week");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.yearMonth).toBe("2026-08");
  expect(view.weekAnchor).toBe("2026-08-17");
  expect(view.scheduleAnchor).toBe("2026-08-17");
});

test("deriveBoardView は search を優先する", () => {
  const view = deriveBoardView(
    {
      date: "2026-08-01",
      month: "2026-07",
      tab: "schedule",
      view: "month",
      week: "2026-07-28",
    },
    "2026-08-17",
  );
  expect(view.tab).toBe("schedule");
  expect(view.scheduleView).toBe("month");
  expect(view.selectedDateJst).toBe("2026-08-01");
  expect(view.yearMonth).toBe("2026-07");
  expect(view.weekAnchor).toBe("2026-07-28");
  expect(view.scheduleAnchor).toBe("2026-07-01");
});

test("deriveBoardView の week 省略時は date の月曜", () => {
  const view = deriveBoardView({ date: "2026-08-20" }, "2026-08-17");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.weekAnchor).toBe("2026-08-17");
});

test("deriveBoardView は未来の date と month を today に戻す", () => {
  const view = deriveBoardView({ date: "2026-09-01", month: "2026-09" }, "2026-08-17");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.yearMonth).toBe("2026-08");
});

test("deriveBoardView は month 未指定時に date の月を yearMonth に使う", () => {
  const view = deriveBoardView({ date: "2026-07-10" }, "2026-08-17");
  expect(view.yearMonth).toBe("2026-07");
});

test("deriveBoardView は date と month を両方クリアすると today の月になる", () => {
  const view = deriveBoardView({}, "2026-08-17");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.yearMonth).toBe("2026-08");
});

test("scheduleAnchorDateJst は view ごとに anchor を決める", () => {
  expect(scheduleAnchorDateJst("day", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-08-05");
  expect(scheduleAnchorDateJst("week", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-08-04");
  expect(scheduleAnchorDateJst("month", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-07-01");
  expect(scheduleAnchorDateJst("year", "2026-08-05", "2026-08-04", "2026-07")).toBe("2026-01-01");
});
