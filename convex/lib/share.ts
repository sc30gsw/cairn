import { flatMap, groupBy, pipe, prop, sortBy } from "remeda";

import type { ShareRow } from "./validators";

export type { ShareRow };

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

  return pipe(
    names,
    flatMap((category) => {
      const categoryRows = byCategory[category] ?? [];
      const [only] = categoryRows;
      //? ひとこと空 かつ 項目名がカテゴリ名と一致 かつ その1件だけ、のときだけ親+子の重複を畳む
      if (
        categoryRows.length === 1 &&
        only !== undefined &&
        only.content === "" &&
        only.itemName === category
      ) {
        return [`- ${category} ${only.minutes}分`];
      }
      const lines = categoryRows.map((row) => `  - ${lineText(row)}`);
      return [`- ${category}`, ...lines];
    }),
  ).join("\n");
}
