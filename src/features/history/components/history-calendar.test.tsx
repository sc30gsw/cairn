import { expect, test, vi } from "vite-plus/test";

import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { WeekAgenda } from "~/features/history/components/week-agenda";
import { buildHeatmapChartData, formatHeatmapTooltip } from "~/features/history/lib/heatmap-colors";
import { renderWithMantine } from "~/test-utils/render";

test("buildHeatmapChartData は休養を 0 にする", () => {
  expect(
    buildHeatmapChartData([
      { dateJst: "2026-08-15", isRest: true, minutes: 0, movingAverage: 0 },
      { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
    ]),
  ).toEqual({
    "2026-08-15": 0,
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

test("学習量ヒートマップが Mantine Heatmap を描画", () => {
  const { container } = renderWithMantine(
    <HistoryLearningHeatmap
      days={[{ dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 }]}
      onDayClick={vi.fn()}
      yearMonth="2026-08"
    />,
  );
  expect(container.querySelector(".mantine-Heatmap-root")).toBeDefined();
});

test("MonthView に学習内容と分数が見える", () => {
  const { getByText } = renderWithMantine(
    <HistoryMonthView
      days={[{ dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 }]}
      events={[
        {
          category: "多聴",
          dateJst: "2026-08-17",
          minutes: 30,
          rowId: "r1" as never,
          status: "確定",
          title: "Distinction 2000",
        },
      ]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
    />,
  );
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("30分")).toBeDefined();
  expect(getByText("記録")).toBeDefined();
  expect(getByText("学習量")).toBeDefined();
  expect(getByText("色の濃さは1日の学習時間です。")).toBeDefined();
});

test("記録が学習量より上に並ぶ", () => {
  const { getByText } = renderWithMantine(
    <HistoryMonthView
      days={[]}
      events={[]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
    />,
  );
  const record = getByText("記録");
  const volume = getByText("学習量");
  expect(record.compareDocumentPosition(volume) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("年・月選択で onMonthChange が呼ばれる", () => {
  const onMonthChange = vi.fn();
  const { getByRole } = renderWithMantine(
    <HistoryMonthView
      days={[]}
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
