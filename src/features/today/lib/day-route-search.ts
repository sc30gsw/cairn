import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import {
  DaySearchSchema,
  daySearchDefaults,
  type DaySearch,
} from "~/features/today/schemas/day-search-schema";

/**
 * 日画面ルート共通: Valibot 1.0+ は Standard Schema 対応のため adapter なしで validateSearch に渡せる。
 * stripSearchParams でデフォルト search を URL から除く。
 * validateSearch は createFileRoute 内に直接書く（spread だとルート型が崩れる）。
 */
export const daySearchMiddlewares: SearchMiddleware<DaySearch>[] = [
  stripSearchParams(daySearchDefaults),
];

export function shouldStripDatedDayPreset(
  dateJst: DateJst,
  preset: DaySearch["preset"],
  today: DateJst,
): boolean {
  return dateJst !== today && preset !== undefined;
}

export { DaySearchSchema };
