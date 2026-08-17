import type { MantineColor } from "@mantine/core";

import {
  qualifyingDaysLabel,
  recordedWeeks,
  shortDateLabel,
} from "~/features/goals/lib/weekly-trend-format";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

export type WeeklyTrendChartPoint = {
  label: string;
  //? ツールチップ用。判定は実施日ベースなので、棒の高さ(分数)だけでは達成理由が読めない
  qualifying: string;
  volumeMinutes: number;
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
    const achieved = week.goalDays !== null && week.achieved;
    return {
      label: `${shortDateLabel(week.weekStart)}〜${shortDateLabel(week.weekEnd)}`,
      qualifying: qualifyingDaysLabel(week),
      volumeMinutes: week.volumeMinutes,
      他: achieved ? null : week.volumeMinutes,
      達成: achieved ? week.volumeMinutes : null,
    };
  });
}
