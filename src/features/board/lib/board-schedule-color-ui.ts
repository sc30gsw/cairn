import type { MantineColorShade } from "@mantine/core";
import type { BoardScheduleColor } from "~domain/boardScheduleColors";
import type { googleCalendarEventColor } from "~domain/googleCalendarColors";

type SchedulePaletteColor = BoardScheduleColor | ReturnType<typeof googleCalendarEventColor>;

const BOARD_SCHEDULE_COLOR_SHADE_MAPPING = {
  blue: 4,
  cyan: 5,
  indigo: 6,
  green: 4,
  gray: 5,
  lime: 3,
  red: 3,
  orange: 3,
  pink: 3,
  yellow: 2,
  teal: 5,
  violet: 6,
  grape: 4,
} as const satisfies Record<SchedulePaletteColor, MantineColorShade>;

export function boardScheduleColorCss(
  color: SchedulePaletteColor,
): `var(--mantine-color-${SchedulePaletteColor}-${MantineColorShade})` {
  return `var(--mantine-color-${color}-${BOARD_SCHEDULE_COLOR_SHADE_MAPPING[color]})`;
}
