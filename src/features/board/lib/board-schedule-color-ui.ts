import type { BoardScheduleColor } from "~domain/boardScheduleColors";

export function boardScheduleColorCss(color: BoardScheduleColor): string {
  return `var(--mantine-color-${color}-6)`;
}
