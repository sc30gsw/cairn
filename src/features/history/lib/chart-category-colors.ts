export const CHART_CATEGORY_COLORS: Record<string, string> = {
  TOEIC対策: "blue.6",
  多聴: "yellow.6",
  多読: "blue.4",
  英会話: "blue.8",
  その他: "gray.6",
  不明: "gray.5",
  見送り: "yellow.4",
};

export function chartCategoryColor(category: string): string {
  return CHART_CATEGORY_COLORS[category] ?? CHART_CATEGORY_COLORS["不明"] ?? "gray.5";
}
