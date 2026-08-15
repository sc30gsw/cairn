import { expect, test, vi } from "vite-plus/test";

import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { WeekAgenda } from "~/features/history/components/week-agenda";
import { renderWithMantine } from "~/test-utils/render";

test("空マスが休養に見える", () => {
  const { getByText } = renderWithMantine(
    <HistoryMonthView
      days={[
        { dateJst: "2026-08-15", isRest: true, minutes: 0, movingAverage: 0 },
        { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
      ]}
      month={new Date("2026-08-15T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
    />,
  );
  expect(getByText(/休養/)).toBeDefined();
  expect(getByText(/均10分/)).toBeDefined();
  expect(getByText("背景色は学習時間のヒートマップです。")).toBeDefined();
  expect(getByText("休養（記録なし）")).toBeDefined();
  expect(getByText("120分+")).toBeDefined();
});

test("週の行がタイトルとステータスで見える", () => {
  const { getAllByText, getByText } = renderWithMantine(
    <WeekAgenda
      todayJst="2026-08-17"
      week={{
        events: [
          {
            category: "多聴",
            dateJst: "2026-08-17",
            minutes: 30,
            rowId: "r1" as never,
            status: "確定",
            title: "Distinction 2000",
          },
        ],
        volumeMinutes: 30,
        weekEnd: "2026-08-23",
        weekStart: "2026-08-17",
        weeklyGoalMinutes: 300,
      }}
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText("完了")).toBeDefined();
  expect(getAllByText("30分").length).toBeGreaterThan(0);
});
