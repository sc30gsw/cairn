import { flatMap, groupBy, pipe, prop, sortBy } from "remeda";

export type ShareRow = {
  category: string;
  categorySortOrder: number;
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

function usedCategories(rows: readonly ShareRow[]): string[] {
  const seen = new Map<string, number>();
  for (const row of rows) {
    if (!seen.has(row.category)) {
      seen.set(row.category, row.categorySortOrder);
    }
  }
  return [...seen.entries()]
    .toSorted((left, right) => left[1] - right[1] || left[0].localeCompare(right[0], "ja"))
    .map(([name]) => name);
}

export function formatShareMarkdown(rows: readonly ShareRow[]): string {
  const confirmed = sortBy(
    rows.filter((row) => row.status === "確定"),
    prop("sortOrder"),
  );
  if (confirmed.length === 0) {
    return "";
  }

  const byCategory = groupBy(confirmed, prop("category"));

  const names = usedCategories(confirmed);
  if (names.length === 1) {
    const only = names[0];
    if (only === undefined) {
      return "";
    }
    return (byCategory[only] ?? []).map((row) => `- ${lineText(row)}`).join("\n");
  }

  return pipe(
    names,
    flatMap((category) => {
      const lines = (byCategory[category] ?? []).map((row) => `  - ${lineText(row)}`);
      return [`- ${category}`, ...lines];
    }),
  ).join("\n");
}
