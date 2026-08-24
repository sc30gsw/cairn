//? 今月/先月の byCategory の突き合わせと delta% はクライアントの純関数に置く。
//? サーバはカテゴリ別分数の生値だけを返し、日本語ラベルや丸め方という表示の関心は持たない。

import type { MonthlyCategoryBreakdown } from "~/features/review/types/monthly-review";

export type CategoryComparisonRow = {
  category: string;
  categorySortOrder: number;
  currentMinutes: number;
  /** 「+80分（+15%）」「新規」「先月のみ」「変化なし」 */
  deltaLabel: string;
  deltaMinutes: number;
  previousMinutes: number;
};

//? 先月だけにあるカテゴリは一覧の末尾に固定する(使わなくなったカテゴリが自然に下へ落ちる)
const PREVIOUS_ONLY_SORT_ORDER = Number.MAX_SAFE_INTEGER;

function deltaLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) {
    return "変化なし";
  }
  if (previous === 0) {
    return "新規";
  }
  const delta = current - previous;
  if (delta === 0) {
    return "変化なし";
  }
  const percent = Math.round((delta / previous) * 100);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}分（${sign}${percent}%）`;
}

//* カテゴリ名で今月と先月を突き合わせる。名前ベースなのは byCategory 自体が名前集計だから(履歴全体と同じ設計)。
export function buildCategoryComparisonRows(
  current: readonly MonthlyCategoryBreakdown[],
  previous: readonly Pick<MonthlyCategoryBreakdown, "category" | "minutes">[],
): CategoryComparisonRow[] {
  const previousByCategory = new Map(previous.map((entry) => [entry.category, entry.minutes]));
  const currentCategories = new Set(current.map((entry) => entry.category));

  const currentRows = current.map((entry) => {
    const previousMinutes = previousByCategory.get(entry.category) ?? 0;
    return {
      category: entry.category,
      categorySortOrder: entry.categorySortOrder,
      currentMinutes: entry.minutes,
      deltaLabel: deltaLabel(entry.minutes, previousMinutes),
      deltaMinutes: entry.minutes - previousMinutes,
      previousMinutes,
    };
  });

  const previousOnlyRows = previous.flatMap((entry) =>
    currentCategories.has(entry.category)
      ? []
      : [
          {
            category: entry.category,
            categorySortOrder: PREVIOUS_ONLY_SORT_ORDER,
            currentMinutes: 0,
            deltaLabel: "先月のみ",
            deltaMinutes: -entry.minutes,
            previousMinutes: entry.minutes,
          },
        ],
  );

  //? sort するのはこの行で作った新しい配列だけ。引数の配列は触らない
  return [...currentRows, ...previousOnlyRows].sort(
    (left, right) =>
      left.categorySortOrder - right.categorySortOrder ||
      left.category.localeCompare(right.category, "ja"),
  );
}

//* グラフは今月・先月ともに0分の行を落とす(表には出すが、グラフのノイズにはしない)。
export function categoryComparisonChartRows(
  rows: readonly CategoryComparisonRow[],
): CategoryComparisonRow[] {
  return rows.filter((row) => row.currentMinutes > 0 || row.previousMinutes > 0);
}
