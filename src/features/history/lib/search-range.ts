import { addMonthsJst, type DateJst } from "~domain/jst";

import type { HistorySearchRange } from "~/features/history/schemas/history-search-schema";

export const SEARCH_RANGE_LABELS = {
  all: "全期間",
  year: "12か月",
} as const satisfies Record<HistorySearchRange, string>;

export const SEARCH_RANGE_ORDER = ["year", "all"] as const satisfies readonly HistorySearchRange[];

//? 既定の検索範囲は「12か月前の月初」から。全期間なら下限なし（undefined）
export function searchFromJst(range: HistorySearchRange, today: DateJst): DateJst | undefined {
  if (range === "all") {
    return undefined;
  }
  return `${addMonthsJst(today.slice(0, 7), -12)}-01`;
}

export function isSearchRange(value: string): value is HistorySearchRange {
  return SEARCH_RANGE_ORDER.some((range) => range === value);
}
