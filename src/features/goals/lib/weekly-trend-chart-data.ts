import type { MantineColor } from "@mantine/core";

import { recordedWeeks, shortDateLabel } from "~/features/goals/lib/weekly-trend-format";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

export type WeeklyTrendChartPoint = {
  label: string;
  他: number | null;
  達成: number | null;
};

export const WEEKLY_TREND_CHART_SERIES = [
  { color: "green.6", label: "達成", name: "達成" },
  { color: "gray.5", label: "未達・ゴールなし", name: "他" },
] as const satisfies {
  color: `${MantineColor}.${number}`;
  name: string;
  label: WeeklyTrendChartPoint["label"];
}[];

//* 数値一覧(WeeklyTrendList)を主、チャートを従とする補助表示。時系列順(古い→新しい)で渡す。
export function buildWeeklyTrendChartData(weeks: WeeklyTrendWeeks): WeeklyTrendChartPoint[] {
  return [...recordedWeeks(weeks)].reverse().map((week) => {
    const achieved = week.goalMinutes !== null && week.achieved;
    return {
      label: `${shortDateLabel(week.weekStart)}〜${shortDateLabel(week.weekEnd)}`,
      他: achieved ? null : week.volumeMinutes,
      達成: achieved ? week.volumeMinutes : null,
    };
  });
}

//* 直近でゴールが設定されていた週のゴール分数を目安線として返す。どの週にもゴールがなければ null。
export function weeklyTrendGoalReferenceLine(weeks: WeeklyTrendWeeks): number | null {
  return weeks.find((week) => week.goalMinutes !== null)?.goalMinutes ?? null;
}
