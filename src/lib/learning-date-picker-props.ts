import type { DateJst } from "~domain/jst";

import { calendarDayProps } from "~/lib/calendar-day-style";

export function learningDatePickerProps(todayJst: DateJst) {
  return {
    firstDayOfWeek: 1 as const,
    getDayProps: (date: string) => calendarDayProps(date, todayJst),
    getMonthControlProps: (month: string) => ({
      disabled: month.slice(0, 7) > todayJst.slice(0, 7),
    }),
    getYearControlProps: (year: string) => ({
      disabled: year.slice(0, 4) > todayJst.slice(0, 4),
    }),
    locale: "ja",
    maxDate: todayJst,
    popoverProps: { withinPortal: true },
  };
}
