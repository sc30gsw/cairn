import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { WeekAgenda } from "~/features/history/components/week-agenda";
import {
  buildHeatmapChartData,
  formatHeatmapTooltip,
  yearHeatmapRange,
} from "~/features/history/lib/heatmap-colors";
import type { MonthEvent, WeekPage } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/days/rest">{children}</a>,
}));

const [confirmed, pending] = [STATUSES[0], STATUSES[1]] as const;

test("buildHeatmapChartData は休養と0分を除外する", () => {
  expect(
    buildHeatmapChartData([
      {
        condition: null,
        dateJst: "2026-08-15",
        isRest: true,
        memo: null,
        minutes: 0,
        movingAverage: 0,
      },
      {
        condition: null,
        dateJst: "2026-08-17",
        isRest: false,
        memo: null,
        minutes: 30,
        movingAverage: 10,
      },
    ]),
  ).toEqual({
    "2026-08-17": 30,
  });
});

test("formatHeatmapTooltip", () => {
  expect(
    formatHeatmapTooltip("2026-08-15", 0, {
      condition: null,
      dateJst: "2026-08-15",
      isRest: true,
      memo: null,
      minutes: 0,
      movingAverage: 0,
    }),
  ).toBe("2026-08-15 — 休養");
  expect(
    formatHeatmapTooltip("2026-08-17", 30, {
      condition: null,
      dateJst: "2026-08-17",
      isRest: false,
      memo: null,
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
      days={[
        {
          condition: null,
          dateJst: "2026-08-17",
          isRest: false,
          memo: null,
          minutes: 30,
          movingAverage: 10,
        },
      ]}
      onDayClick={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  expect(container.querySelector(".mantine-Heatmap-root")).toBeDefined();
});

test("MonthView に確定した学習内容と分数が見える", () => {
  const { getByText, queryByText } = renderWithMantine(
    <HistoryMonthView
      days={[]}
      events={
        [
          {
            category: "多聴",
            dateJst: "2026-08-17",
            minutes: 30,
            rowId: "r1" as never,
            status: confirmed,
            title: "Distinction 2000",
          },
          {
            category: "英会話",
            dateJst: "2026-08-17",
            minutes: 20,
            rowId: "r2" as never,
            status: pending,
            title: "英会話",
          },
        ] satisfies MonthEvent[]
      }
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("30分")).toBeDefined();
  expect(queryByText("英会話")).toBeNull();
  expect(getByText("記録")).toBeDefined();
});

test("分析パネルの月スコープに学習量ヒートマップが見える", () => {
  const { getByText, container, queryByText } = renderWithMantine(
    <HistoryAnalysisPanel
      day={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 0,
        dateJst: "2026-08-17",
        isRest: false,
        rows: [],
        skippedMinutes: 0,
      }}
      heatmapDays={[
        {
          condition: null,
          dateJst: "2026-08-17",
          isRest: false,
          memo: null,
          minutes: 30,
          movingAverage: 10,
        },
      ]}
      month={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 30,
        days: [
          {
            condition: null,
            dateJst: "2026-08-17",
            isRest: false,
            memo: null,
            minutes: 30,
            movingAverage: 10,
          },
        ],
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
        byCondition: [],
        byDay: [],
        confirmedMinutes: 0,
        rows: [],
        skippedMinutes: 0,
        volumeMinutes: 0,
        weekEnd: "2026-08-23",
        weekStart: "2026-08-17",
      }}
      yearMonth="2026-08"
    />,
  );
  expect(getByText("学習量（直近365日）")).toBeDefined();
  expect(container.querySelector(".mantine-Heatmap-root")).toBeDefined();
  expect(queryByText(/完了.*見送り/)).toBeNull();
  expect(getByText("日別ペース")).toBeDefined();
  expect(getByText("コンディション別の学習量")).toBeDefined();
  expect(getByText("コンディション別の平均学習量")).toBeDefined();
});

test("月マスに学習量と均を載せる", () => {
  const { container } = renderWithMantine(
    <HistoryMonthView
      days={[
        {
          condition: "好調",
          dateJst: "2026-08-17",
          isRest: false,
          memo: null,
          minutes: 30,
          movingAverage: 10,
        },
      ]}
      events={[]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  const cell = container.querySelector("[data-volume='30']");
  expect(cell).not.toBeNull();
  expect(cell?.getAttribute("data-avg")).toBe("10");
  expect(cell?.getAttribute("data-condition")).toBe("好調");
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
      todayJst="2026-09-01"
    />,
  );

  getByRole("button", { name: "次" }).click();
  expect(onMonthChange).toHaveBeenCalledTimes(1);
  expect(onMonthChange.mock.calls[0]?.[0]?.getMonth()).toBe(8);
});

test("閲覧月が今日の月なら次へは押せない", () => {
  const onMonthChange = vi.fn();
  const { getByRole } = renderWithMantine(
    <HistoryMonthView
      days={[]}
      events={[]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={vi.fn()}
      onMonthChange={onMonthChange}
      todayJst="2026-08-17"
    />,
  );

  const next = getByRole("button", { name: "次" });
  expect((next as HTMLButtonElement).disabled).toBe(true);
  next.click();
  expect(onMonthChange).not.toHaveBeenCalled();
});

test("未来の日をクリックしても分析へ進まない", () => {
  const onDayClick = vi.fn();
  const { getByText } = renderWithMantine(
    <HistoryMonthView
      days={[]}
      events={[]}
      month={new Date("2026-08-17T12:00:00+09:00")}
      onDayClick={onDayClick}
      onMonthChange={vi.fn()}
      todayJst="2026-08-17"
    />,
  );

  getByText("20").click();
  expect(onDayClick).not.toHaveBeenCalled();
});

test("週の行がタイトルとステータスで見える", () => {
  const { getAllByText, getByText } = renderWithMantine(
    <WeekAgenda
      week={
        {
          days: [
            {
              condition: "好調",
              dateJst: "2026-08-17",
              isRest: false,
              memo: "集中できた",
              minutes: 30,
              movingAverage: 10,
            },
          ],
          events: [
            {
              category: "多聴",
              dateJst: "2026-08-17",
              minutes: 30,
              rowId: "r1" as never,
              status: confirmed,
              title: "Distinction 2000",
            },
          ],
          volumeMinutes: 30,
          weekEnd: "2026-08-23",
          weekStart: "2026-08-17",
        } satisfies WeekPage
      }
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText("完了")).toBeDefined();
  expect(getByText("好調")).toBeDefined();
  expect(getByText("集中できた")).toBeDefined();
  expect(getAllByText("30分").length).toBeGreaterThan(0);
});

test("分析パネルの日スコープでメモハイライトが見える", () => {
  const { getByText } = renderWithMantine(
    <HistoryAnalysisPanel
      day={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 30,
        dateJst: "2026-08-17",
        isRest: false,
        rows: [],
        skippedMinutes: 0,
      }}
      heatmapDays={[
        {
          condition: "好調",
          dateJst: "2026-08-17",
          isRest: false,
          memo: "集中できた",
          minutes: 30,
          movingAverage: 10,
        },
      ]}
      month={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 30,
        days: [
          {
            condition: "好調",
            dateJst: "2026-08-17",
            isRest: false,
            memo: "集中できた",
            minutes: 30,
            movingAverage: 10,
          },
        ],
        events: [],
        rows: [],
        skippedMinutes: 0,
      }}
      onDayClick={vi.fn()}
      onScopeChange={vi.fn()}
      scope="day"
      selectedDateJst="2026-08-17"
      todayJst="2026-08-17"
      week={{
        byCategory: [],
        byCondition: [],
        byDay: [],
        confirmedMinutes: 0,
        rows: [],
        skippedMinutes: 0,
        volumeMinutes: 0,
        weekEnd: "2026-08-23",
        weekStart: "2026-08-17",
      }}
      yearMonth="2026-08"
    />,
  );
  expect(getByText("この日のメモ")).toBeDefined();
  expect(getByText("集中できた")).toBeDefined();
  expect(getByText("確定 30分")).toBeDefined();
});

test("週Agendaの日付ヘッダーが日ページへリンクする", () => {
  const { getByRole } = renderWithMantine(
    <WeekAgenda
      week={
        {
          days: [
            {
              condition: "好調",
              dateJst: "2026-08-17",
              isRest: false,
              memo: "集中できた",
              minutes: 30,
              movingAverage: 10,
            },
          ],
          events: [],
          volumeMinutes: 30,
          weekEnd: "2026-08-23",
          weekStart: "2026-08-17",
        } satisfies WeekPage
      }
    />,
  );
  expect(getByRole("link", { name: /8月17日/ })).toBeDefined();
});

test("休養の日でもこの日を開くがある", () => {
  const { getByRole, getByText } = renderWithMantine(
    <HistoryAnalysisPanel
      day={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 0,
        dateJst: "2026-08-15",
        isRest: true,
        rows: [],
        skippedMinutes: 0,
      }}
      heatmapDays={[
        {
          condition: null,
          dateJst: "2026-08-15",
          isRest: true,
          memo: null,
          minutes: 0,
          movingAverage: 0,
        },
      ]}
      month={{
        byCategory: [],
        byCondition: [],
        confirmedMinutes: 0,
        days: [
          {
            condition: null,
            dateJst: "2026-08-15",
            isRest: true,
            memo: null,
            minutes: 0,
            movingAverage: 0,
          },
        ],
        events: [],
        rows: [],
        skippedMinutes: 0,
      }}
      onDayClick={vi.fn()}
      onScopeChange={vi.fn()}
      scope="day"
      selectedDateJst="2026-08-15"
      todayJst="2026-08-17"
      week={{
        byCategory: [],
        byCondition: [],
        byDay: [],
        confirmedMinutes: 0,
        rows: [],
        skippedMinutes: 0,
        volumeMinutes: 0,
        weekEnd: "2026-08-16",
        weekStart: "2026-08-10",
      }}
      yearMonth="2026-08"
    />,
  );
  expect(getByText("この日は記録がありません。")).toBeDefined();
  expect(getByRole("link", { name: "この日を開く" })).toBeDefined();
});
