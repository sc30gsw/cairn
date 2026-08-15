import { expect, test, vi } from "vite-plus/test";

import { HistoryCalendar } from "~/features/history/components/history-calendar";
import { WeekAgenda } from "~/features/history/components/week-agenda";
import { renderWithMantine } from "~/test-utils/render";

test("空マスが休養に見える", () => {
  const { getByText } = renderWithMantine(
    <HistoryCalendar
      days={[
        { dateJst: "2026-08-15", isRest: true, minutes: 0, movingAverage: 0 },
        { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
      ]}
      month={new Date("2026-08-15T12:00:00+09:00")}
      onMonthChange={vi.fn()}
      onOpenDate={vi.fn()}
    />,
  );
  expect(getByText(/休養/)).toBeDefined();
  expect(getByText(/均10分/)).toBeDefined();
});

test("週の行がタイトルとステータスで見える", () => {
  const { getByText } = renderWithMantine(
    <WeekAgenda
      week={{
        events: [{ dateJst: "2026-08-17", minutes: 30, status: "確定", title: "Distinction 2000" }],
        volumeMinutes: 30,
        weekEnd: "2026-08-23",
        weekStart: "2026-08-17",
        weeklyGoalMinutes: 300,
      }}
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText("完了")).toBeDefined();
  expect(getByText("30分")).toBeDefined();
});
