import { expect, test, vi } from "vite-plus/test";

import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { WeekAgenda } from "~/features/history/components/week-agenda";
import {
  buildHeatmapChartData,
  formatHeatmapTooltip,
  yearHeatmapRange,
} from "~/features/history/lib/heatmap-colors";
import { renderWithMantine } from "~/test-utils/render";

test("buildHeatmapChartData は休養と0分を除外する", () => {
  expect(
    buildHeatmapChartData([
      { dateJst: "2026-08-15", isRest: true, minutes: 0, movingAverage: 0 },
      { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
    ]),
  ).toEqual({
    "2026-08-17": 30,
  });
});

test("formatHeatmapTooltip", () => {
  expect(
    formatHeatmapTooltip("2026-08-15", 0, {
      dateJst: "2026-08-15",
      isRest: true,
      minutes: 0,
      movingAverage: 0,
    }),
  ).toBe("2026-08-15 — 休養");
  expect(
    formatHeatmapTooltip("2026-08-17", 30, {
      dateJst: "2026-08-17",
      isRest: false,
      minutes: 30,
      movingAverage: 10,
    }),
  ).toBe("2026-08-17 — 30分（均10分）");
});

test("yearHeatmapRange は直近365日", () => {
  expect(yearHeatmapRange("2026-08-17")).toEqual({
    endDate: "2026-08-17",
    startDate: "2025-08-18",
  });
});

test("学習量ヒートマップが Mantine Heatmap を描画", () => {
  const { container } = renderWithMantine(
    <HistoryLearningHeatmap
      days={[{ dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 }]}
      onDayClick={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  expect(container.querySelector(".mantine-Heatmap-root")).toBeDefined();
});

test("MonthView に確定した学習内容と分数が見える", () => {
  const { getByText, queryByText } = renderWithMantine(
    <HistoryMonthView
      events={[
        {
          category: "多聴",
          dateJst: "2026-08-17",
          minutes: 30,
          rowId: "r1" as never,
          status: "確定",
          title: "Distinction 2000",
        },
        {
          category: "英会話",
          dateJst: "2026-08-17",
          minutes: 20,
          rowId: "r2" as never,
          status: "未着手",
          title: "英会話",
        },
      ]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
    />,
  );
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("30分")).toBeDefined();
  expect(queryByText("英会話")).toBeNull();
  expect(getByText("記録")).toBeDefined();
});

test("分析パネルの月スコープに学習量ヒートマップが見える", () => {
  const { getByText, container } = renderWithMantine(
    <HistoryAnalysisPanel
      day={{
        byCategory: [],
        confirmedMinutes: 0,
        dateJst: "2026-08-17",
        isRest: false,
        rows: [],
        skippedMinutes: 0,
      }}
      heatmapDays={[{ dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 }]}
      month={{
        byCategory: [],
        confirmedMinutes: 30,
        days: [],
        events: [],
        rows: [],
        skippedMinutes: 0,
      }}
      onDayClick={vi.fn()}
      onScopeChange={vi.fn()}
      scope="month"
      selectedDateJst="2026-08-17"
      todayJst="2026-08-17"
      week={{
        byCategory: [],
        byDay: [],
        confirmedMinutes: 0,
        rows: [],
        skippedMinutes: 0,
        volumeMinutes: 0,
        weekEnd: "2026-08-23",
        weekStart: "2026-08-17",
        weeklyGoalMinutes: null,
      }}
      yearMonth="2026-08"
    />,
  );
  expect(getByText("学習量（直近365日）")).toBeDefined();
  expect(container.querySelector(".mantine-Heatmap-root")).toBeDefined();
});

test("年・月選択で onMonthChange が呼ばれる", () => {
  const onMonthChange = vi.fn();
  const { getByRole } = renderWithMantine(
    <HistoryMonthView
      events={[]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={onMonthChange}
    />,
  );

  getByRole("button", { name: "次" }).click();
  expect(onMonthChange).toHaveBeenCalledTimes(1);
  expect(onMonthChange.mock.calls[0]?.[0]?.getMonth()).toBe(8);
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
