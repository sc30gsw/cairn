import type { Weekday } from "~domain/catalog";

export function presetWeekdayHash(weekday: Weekday) {
  return `preset-weekday-${weekday}` as const;
}
