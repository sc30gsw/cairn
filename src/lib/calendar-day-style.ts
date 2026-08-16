import dayjs from "dayjs";
import type { DateJst } from "~domain/jst";

import { holidayName } from "~/lib/holiday";

import classes from "~/lib/calendar-day-style.module.css";

export { classes as calendarDayStyleClasses };

export function calendarDayClassName(
  dateJst: DateJst | string,
  todayJst?: DateJst | string,
): string | undefined {
  if (todayJst !== undefined && dateJst === todayJst) {
    return undefined;
  }
  if (holidayName(dateJst)) {
    return classes.holidayDay;
  }
  const weekday = dayjs(dateJst).day();
  if (weekday === 0) {
    return classes.sundayDay;
  }
  if (weekday === 6) {
    return classes.saturdayDay;
  }
  return undefined;
}

export function calendarDayProps(
  dateJst: DateJst | string,
  todayJst?: DateJst | string,
): { className?: string; title?: string } {
  const holiday = holidayName(dateJst);
  const className = calendarDayClassName(dateJst, todayJst);
  return {
    ...(className ? { className } : {}),
    ...(holiday ? { title: holiday } : {}),
  };
}
