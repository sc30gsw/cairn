import type { Weekday } from "./catalog";
import { isHolidayJst } from "./holiday";
import { weekdayFromDateJst } from "./jst";

export const SUNDAY_WEEKDAY = 0 as const satisfies Weekday;

export type PresetSettings = { holidayAsSunday: boolean };

//? 祝日を日曜扱いにするかは所有者の設定。曜日の列挙を増やさず、日曜のプリセットへ寄せるだけにする
export function presetWeekdayFor(dateJst: string, settings: PresetSettings): Weekday {
  if (settings.holidayAsSunday && isHolidayJst(dateJst)) {
    return SUNDAY_WEEKDAY;
  }
  return weekdayFromDateJst(dateJst);
}
