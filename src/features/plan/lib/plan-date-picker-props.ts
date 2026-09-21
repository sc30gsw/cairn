import type { DatePickerInputProps } from "@mantine/dates";

import { calendarDayProps } from "~/lib/calendar-day-style";

export function planDatePickerProps() {
  return {
    firstDayOfWeek: 1,
    getDayProps: calendarDayProps,
    locale: "ja",
    popoverProps: { withinPortal: true },
  } as const satisfies DatePickerInputProps;
}
