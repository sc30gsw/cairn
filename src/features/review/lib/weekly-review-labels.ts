import { WEEKDAY_NAMES } from "~domain/catalog";
import { weekdayFromDateJst } from "~domain/jst";

import type { WeeklyReviewDay } from "~/features/review/types/weekly-review";

/** 「月」「火」… WEEKDAY_NAMES(SSoT)の1文字目を使い、曜日リストを再定義しない */
export function weekdayShortLabel(dateJst: string): string {
  return WEEKDAY_NAMES[weekdayFromDateJst(dateJst)].slice(0, 1);
}

/** 「08/17」 */
export function monthDayLabel(dateJst: string): string {
  return `${dateJst.slice(5, 7)}/${dateJst.slice(8, 10)}`;
}

function weekOfMonth(dateJst: string): number {
  return Math.floor((Number(dateJst.slice(8, 10)) - 1) / 7) + 1;
}

/** 「8月第3週（08/17 月 〜 08/23 日）」。月をまたぐ週は範囲だけ「08/31 月 〜 09/06 日」 */
export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const range = `${monthDayLabel(weekStart)} ${weekdayShortLabel(weekStart)} 〜 ${monthDayLabel(weekEnd)} ${weekdayShortLabel(weekEnd)}`;
  if (weekStart.slice(0, 7) !== weekEnd.slice(0, 7)) {
    //? 月をまたぐ週に「第n週」を付けると、どちらの月の第n週か言えなくなる
    return range;
  }
  return `${Number(weekStart.slice(5, 7))}月第${weekOfMonth(weekStart)}週（${range}）`;
}

/** "up" | "down" | "flat" */
export function deltaDirection(current: number, previous: number): "down" | "flat" | "up" {
  if (current > previous) {
    return "up";
  }
  if (current < previous) {
    return "down";
  }
  return "flat";
}

//? 増減の良し悪しをアプリが評価しない。符号つきテキストだけを出す(色で塗らない)
function signedLabel(delta: number, unit: string): string {
  if (delta === 0) {
    return `±0${unit}`;
  }
  return delta > 0 ? `+${delta}${unit}` : `${delta}${unit}`;
}

/** 「先週 540分（+80分）」/ 前週に記録が無ければ「先週の記録はありません」 */
export function previousWeekLabel(current: number, previous: number, unit: string): string {
  if (previous === 0) {
    return "先週の記録はありません";
  }
  return `先週 ${previous}${unit}（${signedLabel(current - previous, unit)}）`;
}

/** 週内で経過した日数で割る。休養は0分として数に入る(CONTEXT「学習量」) */
export function dailyAverageMinutes(confirmedMinutes: number, elapsedDays: number): number {
  return elapsedDays === 0 ? 0 : Math.round(confirmedMinutes / elapsedDays);
}

/** 0〜100 のパーセント。超過は 100 で止める */
export function percentOf(current: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / total) * 100));
}

/** 掘る先は履歴/分析の週スコープ。同じ絵を週次レビューに置かず、リンクで渡す */
export function historyWeekAnalysisLink(weekStart: string) {
  return {
    search: { scope: "week" as const, tab: "analysis" as const, week: weekStart },
    to: "/history" as const,
  };
}

/** 「4/5（80%）」/「—（今日）」/「—」 */
export function digestCellLabel(
  day: Pick<WeeklyReviewDay, "confirmedCount" | "dateJst" | "digestRate" | "plannedCount">,
  todayJst: string,
): string {
  if (day.digestRate === null) {
    return day.dateJst === todayJst ? "—（今日）" : "—";
  }
  return `${day.confirmedCount}/${day.plannedCount}（${Math.round(day.digestRate * 100)}%）`;
}
