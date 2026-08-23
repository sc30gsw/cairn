import type { MantineColorShade } from "@mantine/core";
import type { BoardScheduleColor } from "~domain/boardScheduleColors";

const BOARD_SCHEDULE_COLOR_SHADE_MAPPING = {
  blue: 4,
  cyan: 5,
  indigo: 6,
  green: 4,
  lime: 3,
  red: 3,
  orange: 3,
  pink: 3,
  yellow: 2,
  teal: 5,
  violet: 6,
  grape: 4,
} as const satisfies Record<BoardScheduleColor, MantineColorShade>;

export function boardScheduleColorCss(
  color: BoardScheduleColor,
): `var(--mantine-color-${BoardScheduleColor}-${MantineColorShade})` {
  return `var(--mantine-color-${color}-${BOARD_SCHEDULE_COLOR_SHADE_MAPPING[color]})`;
}
