import { flatMap, groupBy, pipe, prop, sortBy } from "remeda";

import type { BreakdownRow, ShareRow } from "./validators";

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

function mergeShareContent(left: string, right: string): string {
  if (left === right || right === "") {
    return left;
  }
  if (left === "") {
    return right;
  }
  return `${left}、${right}`;
}

function dedupeConfirmedRows(rows: readonly ShareRow[]): ShareRow[] {
  const merged: ShareRow[] = [];
  const indexByItem = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.category}\0${row.itemName}`;
    const index = indexByItem.get(key);
    if (index === undefined) {
      indexByItem.set(key, merged.length);
      merged.push(row);
      continue;
    }
    const current = merged[index];
    if (current === undefined) {
      continue;
    }
    merged[index] = {
      ...current,
      content: mergeShareContent(current.content, row.content),
      minutes: current.minutes + row.minutes,
    };
  }
  return merged;
}

export function formatShareMarkdown(rows: readonly ShareRow[]): string {
  const confirmed = dedupeConfirmedRows(
    sortBy(
      rows.filter((row) => row.status === "確定"),
      prop("sortOrder"),
    ),
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

export type WeeklyShareInput = {
  activeDays: number;
  rows: readonly Pick<BreakdownRow, "category" | "itemName" | "minutes">[];
  volumeMinutes: number;
  weekEnd: string;
  weekStart: string;
};

export function formatWeeklyShareMarkdown(input: WeeklyShareInput): string {
  if (input.rows.length === 0) {
    return "";
  }
  const header = `週次まとめ ${input.weekStart}〜${input.weekEnd}（学習量 ${input.volumeMinutes}分 / 実施 ${input.activeDays}日）`;
  const byCategory = groupBy(input.rows, prop("category"));
  const names = [...new Set(input.rows.map((row) => row.category))];

  const body = names.flatMap((category) => {
    const categoryRows = byCategory[category] ?? [];
    const [only] = categoryRows;
    if (categoryRows.length === 1 && only !== undefined && only.itemName === category) {
      return [`- ${category} ${only.minutes}分`];
    }
    return [`- ${category}`, ...categoryRows.map((row) => `  - ${row.itemName} ${row.minutes}分`)];
  });

  return [header, ...body].join("\n");
}
