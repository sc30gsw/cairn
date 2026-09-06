import type { Weekday } from "./catalog";
import { isHolidayJst } from "./holiday";
import { weekdayFromDateJst } from "./jst";

export const SUNDAY_WEEKDAY = 0 as const satisfies Weekday;

export type PresetSettings = { holidayAsSunday: boolean };

export function presetWeekdayFor(dateJst: string, settings: PresetSettings): Weekday {
  if (settings.holidayAsSunday && isHolidayJst(dateJst)) {
    return SUNDAY_WEEKDAY;
  }
  return weekdayFromDateJst(dateJst);
}
