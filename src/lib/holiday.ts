import holiday_jp from "@holiday-jp/holiday_jp";

type HolidayMap = Record<string, { name: string }>;

const holidays = holiday_jp.holidays as HolidayMap;

export function holidayName(dateJst: string): null | string {
  const dateKey = dateJst.slice(0, 10);
  return holidays[dateKey]?.name ?? null;
}
