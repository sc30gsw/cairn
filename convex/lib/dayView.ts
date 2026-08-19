import { isFutureDateJst } from "./jst";

export const DAY_VIEW_KINDS = ["live", "todayEmpty", "rest", "unrecorded"] as const;

export type DayViewKind = (typeof DAY_VIEW_KINDS)[number];

export function dayViewKind(args: {
  dateJst: string;
  hasLiveDay: boolean;
  todayJst: string;
}): DayViewKind {
  if (isFutureDateJst(args.dateJst, args.todayJst)) {
    return "unrecorded";
  }
  if (args.hasLiveDay) {
    return "live";
  }
  if (args.dateJst === args.todayJst) {
    return "todayEmpty";
  }
  return "rest";
}

export function isRestCalendarDate(
  dateJst: string,
  todayJst: string,
  hasLiveDay: boolean,
): boolean {
  return dayViewKind({ dateJst, hasLiveDay, todayJst }) === "rest";
}
