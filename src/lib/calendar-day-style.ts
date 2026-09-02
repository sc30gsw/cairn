import type { DateStringValue, DayProps } from "@mantine/dates";
import dayjs from "dayjs";
import { holidayName } from "~domain/holiday";
import { isFutureDateJst } from "~domain/jst";

import classes from "~/lib/calendar-day-style.module.css";

export { classes as calendarDayStyleClasses };

type CalendarDayButtonProps = Pick<Partial<DayProps>, "className" | "disabled" | "title">;

export function calendarDayClassName(
  dateJst: DateStringValue,
  todayJst?: DateStringValue,
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
  dateJst: DateStringValue,
  todayJst?: DateStringValue,
): CalendarDayButtonProps {
  const holiday = holidayName(dateJst);
  const className = calendarDayClassName(dateJst, todayJst);
  return {
    ...(className ? { className } : {}),
    ...(holiday ? { title: holiday } : {}),
  };
}

export function historyCalendarDayProps(
  dateJst: DateStringValue,
  todayJst: DateStringValue,
): CalendarDayButtonProps {
  const dateKey = dateJst.slice(0, 10);
  const todayKey = todayJst.slice(0, 10);
  const base = calendarDayProps(dateKey, todayKey);
  if (!isFutureDateJst(dateKey, todayKey)) {
    return base;
  }
  return {
    className: [base.className, classes.unrecordedDay].filter(Boolean).join(" "),
    disabled: true,
    title: "未記録",
  };
}
