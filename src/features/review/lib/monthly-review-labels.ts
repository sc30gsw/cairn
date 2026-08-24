//? 月固有の表示整形だけを置く。dailyAverageMinutes / deltaDirection は文言を含まない純粋な計算なので
//? weekly-review-labels.ts から import して再利用する(同一 feature 内の import なので規約に触れない)。

/** 「2026年8月」 */
export function yearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

//? 増減の良し悪しをアプリが評価しない。符号つきテキストだけを出す(色で塗らない)
function signedLabel(delta: number, unit: string): string {
  if (delta === 0) {
    return `±0${unit}`;
  }
  return delta > 0 ? `+${delta}${unit}` : `${delta}${unit}`;
}

/** 「先月 540分（+80分）」/ 前月に記録が無ければ「先月の記録はありません」 */
export function previousMonthLabel(current: number, previous: number, unit: string): string {
  if (previous === 0) {
    return "先月の記録はありません";
  }
  return `先月 ${previous}${unit}（${signedLabel(current - previous, unit)}）`;
}

/** 「第3週」/ 月境界や進行中の週は「第5週(一部)」 */
export function monthlyDigestBucketLabel(index: number, isPartial: boolean): string {
  const base = `第${index + 1}週`;
  return isPartial ? `${base}（一部）` : base;
}

/** 「08/01〜08/02」。棒グラフのツールチップと注記に使う */
export function bucketRangeLabel(bucketStart: string, bucketEnd: string): string {
  const day = (dateJst: string) => `${dateJst.slice(5, 7)}/${dateJst.slice(8, 10)}`;
  return bucketStart === bucketEnd ? day(bucketStart) : `${day(bucketStart)}〜${day(bucketEnd)}`;
}

/** 掘る先は履歴/分析の月スコープ。同じ絵を月次レビューに置かず、リンクで渡す */
export function historyMonthAnalysisLink(yearMonth: string) {
  return {
    search: { month: yearMonth, scope: "month" as const, tab: "analysis" as const },
    to: "/history" as const,
  };
}
