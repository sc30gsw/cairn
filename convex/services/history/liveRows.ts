import type { Doc } from "../../_generated/dataModel";

export function liveDayDatesFrom(days: Doc<"days">[]): Set<string> {
  return new Set(days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst));
}

export function liveRows(rows: Doc<"rows">[], liveDayDates: ReadonlySet<string>): Doc<"rows">[] {
  return rows.filter((row) => row.deletedAt === undefined && liveDayDates.has(row.dateJst));
}
