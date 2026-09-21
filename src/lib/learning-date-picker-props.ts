import type { DatePickerInputProps } from "@mantine/dates";
import type { DateJst } from "~domain/jst";

import { calendarDayProps } from "~/lib/calendar-day-style";

export function learningDatePickerProps(todayJst: DateJst, maxDateJst: DateJst = todayJst) {
  return {
    firstDayOfWeek: 1,
    getDayProps: calendarDayProps,
    getMonthControlProps: (month: string) => ({
      disabled: month.slice(0, 7) > maxDateJst.slice(0, 7),
    }),
    getYearControlProps: (year: string) => ({
      disabled: year.slice(0, 4) > maxDateJst.slice(0, 4),
    }),
    locale: "ja",
    maxDate: maxDateJst,
    popoverProps: { withinPortal: true },
  } as const satisfies DatePickerInputProps;
}
