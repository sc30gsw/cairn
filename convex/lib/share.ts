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

export type WeeklyShareInput = {
  activeDays: number;
  //? aggregateBreakdownRows(...).rows。カテゴリ順(categorySortOrder)→項目名 で既にソート済み。
  rows: readonly Pick<BreakdownRow, "category" | "itemName" | "minutes">[];
  volumeMinutes: number;
  weekEnd: string;
  weekStart: string;
};

//* 週版共有文。日版と同じ2階層・同じ畳み込みで、項目ごとに1週ぶんの分数を合算する。
//? 週は範囲が本文だけでは自明でないので、先頭に見出し行を1行だけ足す。
export function formatWeeklyShareMarkdown(input: WeeklyShareInput): string {
  if (input.rows.length === 0) {
    return "";
  }
  const header = `週次まとめ ${input.weekStart}〜${input.weekEnd}（学習量 ${input.volumeMinutes}分 / 実施 ${input.activeDays}日）`;
  const byCategory = groupBy(input.rows, prop("category"));
  //? rows のソート順がカテゴリ固定順そのものなので、出現順を保つだけでカテゴリ順が決まる。
  const names = [...new Set(input.rows.map((row) => row.category))];

  const body = names.flatMap((category) => {
    const categoryRows = byCategory[category] ?? [];
    const [only] = categoryRows;
    //? 日版と同じ畳み込み: 1件だけ かつ 項目名がカテゴリ名と一致 なら親+子の重複を1行にする。
    //? 週版に「ひとこと」は無いので、日版の content === "" 条件は自動的に満たされる。
    if (categoryRows.length === 1 && only !== undefined && only.itemName === category) {
      return [`- ${category} ${only.minutes}分`];
    }
    return [`- ${category}`, ...categoryRows.map((row) => `  - ${row.itemName} ${row.minutes}分`)];
  });

  return [header, ...body].join("\n");
}
