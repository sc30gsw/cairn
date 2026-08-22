import { getStartOfWeek } from "@mantine/schedule";
import dayjs from "dayjs";
import type { DateJst } from "~domain/jst";

export function formatDayNavigationLabel(dateJst: DateJst): string {
  return dayjs(dateJst).format("YYYY年M月D日（ddd）");
}

export function formatWeekNavigationLabel(weekAnchor: DateJst): string {
  const start = dayjs(getStartOfWeek({ date: weekAnchor, firstDayOfWeek: 1 }));
  const end = start.add(6, "day");

  if (start.year() === end.year()) {
    if (start.month() === end.month()) {
      return `${start.format("YYYY年M月D日")} – ${end.format("D日")}`;
    }
    return `${start.format("YYYY年M月D日")} – ${end.format("M月D日")}`;
  }

  return `${start.format("YYYY年M月D日")} – ${end.format("YYYY年M月D日")}`;
}
