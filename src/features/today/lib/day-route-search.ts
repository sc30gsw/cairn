import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import {
  DaySearchSchema,
  daySearchDefaults,
  type DaySearch,
} from "~/features/today/schemas/day-search-schema";

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
