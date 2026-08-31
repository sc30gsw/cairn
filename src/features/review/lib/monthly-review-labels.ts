export function yearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function signedLabel(delta: number, unit: string): string {
  if (delta === 0) {
    return `±0${unit}`;
  }
  return delta > 0 ? `+${delta}${unit}` : `${delta}${unit}`;
}

export function previousMonthLabel(current: number, previous: number, unit: string): string {
  if (previous === 0) {
    return "先月の記録はありません";
  }
  return `先月 ${previous}${unit}（${signedLabel(current - previous, unit)}）`;
}

export function monthlyDigestBucketLabel(index: number, isPartial: boolean): string {
  const base = `第${index + 1}週`;
  return isPartial ? `${base}（一部）` : base;
}

export function bucketRangeLabel(bucketStart: string, bucketEnd: string): string {
  const day = (dateJst: string) => `${dateJst.slice(5, 7)}/${dateJst.slice(8, 10)}`;
  return bucketStart === bucketEnd ? day(bucketStart) : `${day(bucketStart)}〜${day(bucketEnd)}`;
}

export function historyMonthAnalysisLink(yearMonth: string) {
  return {
    search: { month: yearMonth, scope: "month" as const, tab: "analysis" as const },
    to: "/history" as const,
  };
}
