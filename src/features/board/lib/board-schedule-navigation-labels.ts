import { getStartOfWeek } from "@mantine/schedule";
import dayjs from "dayjs";
import type { DateJst } from "~domain/jst";

import { DATE_PICKER_VALUE_FORMAT } from "~/lib/date-display-formats";

export function formatDayNavigationLabel(dateJst: DateJst): string {
  return dayjs(dateJst).format(DATE_PICKER_VALUE_FORMAT);
}

export function formatWeekNavigationLabel(weekAnchor: DateJst): string {
  const start = dayjs(getStartOfWeek({ date: weekAnchor, firstDayOfWeek: 1 }));
  const end = start.add(6, "day");

  return `${start.format(DATE_PICKER_VALUE_FORMAT)} 〜 ${end.format(DATE_PICKER_VALUE_FORMAT)}`;
}
