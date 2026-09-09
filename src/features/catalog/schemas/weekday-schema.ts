import * as v from "valibot";
import { WEEKDAY_RANGE_MESSAGE, WEEKDAYS, type Weekday } from "~domain/catalog";

export const WeekdaySchema = v.picklist(WEEKDAYS, WEEKDAY_RANGE_MESSAGE);

const WeekdayStringSchema = v.pipe(v.string(), v.trim(), v.nonEmpty(WEEKDAY_RANGE_MESSAGE));

export const WeekdayFromSearchSchema = v.pipe(
  v.union([v.number(), WeekdayStringSchema]),
  v.transform((value) => (typeof value === "number" ? value : Number(value))),
  WeekdaySchema,
);

export const WeekdayFromSelectSchema = v.pipe(
  WeekdayStringSchema,
  v.transform(Number),
  WeekdaySchema,
);

export function weekdayFromSelect(value: string): Weekday | undefined {
  const result = v.safeParse(WeekdayFromSelectSchema, value);
  return result.success ? result.output : undefined;
}
