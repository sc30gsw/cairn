import { screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { BoardScheduleNavigation } from "~/features/board/components/board-schedule-navigation";
import { renderWithMantine } from "~/test-utils/render";

const baseProps = {
  monthDate: new Date("2026-08-01T00:00:00+09:00"),
  onDateChange: () => undefined,
  onMonthChange: () => undefined,
  onViewChange: () => undefined,
  onWeekChange: () => undefined,
  selectedDateJst: "2026-08-22" as const,
  todayJst: "2026-08-22" as const,
  weekAnchor: "2026-08-18" as const,
};

test("day view renders a single header control for the date picker", () => {
  renderWithMantine(<BoardScheduleNavigation {...baseProps} scheduleView="day" />);

  expect(screen.getByText("2026年8月22日（土）")).toBeDefined();
  expect(screen.getByLabelText("日付を選択")).toBeDefined();
});

test("week view renders one date control between previous and next", () => {
  renderWithMantine(<BoardScheduleNavigation {...baseProps} scheduleView="week" />);

  expect(screen.getByText("2026年8月17日 – 23日")).toBeDefined();
  expect(screen.getByLabelText("週を選択")).toBeDefined();
});
