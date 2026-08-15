import { CATEGORIES, type Category } from "./categories";

export type ShareRow = {
  category: Category;
  content: string;
  itemName: string;
  minutes: number;
  sortOrder: number;
  status: "スキップ" | "未着手" | "確定";
};

function lineText(row: ShareRow): string {
  if (row.content === "") {
    return `${row.itemName} ${row.minutes}分`;
  }
  return `${row.itemName}: ${row.content} ${row.minutes}分`;
}

export function formatShareMarkdown(rows: readonly ShareRow[]): string {
  const confirmed = rows
    .filter((row) => row.status === "確定")
    .toSorted((left, right) => left.sortOrder - right.sortOrder);
  if (confirmed.length === 0) {
    return "";
  }

  const byCategory = new Map<Category, ShareRow[]>();
  for (const row of confirmed) {
    const bucket = byCategory.get(row.category) ?? [];
    bucket.push(row);
    byCategory.set(row.category, bucket);
  }

  const usedCategories = CATEGORIES.filter((category) => byCategory.has(category));
  if (usedCategories.length === 1) {
    const only = usedCategories[0];
    if (only === undefined) {
      return "";
    }
    return (byCategory.get(only) ?? []).map((row) => `- ${lineText(row)}`).join("\n");
  }

  return usedCategories
    .flatMap((category) => {
      const lines = (byCategory.get(category) ?? []).map((row) => `  - ${lineText(row)}`);
      return [`- ${category}`, ...lines];
    })
    .join("\n");
}
