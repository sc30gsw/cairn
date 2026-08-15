import { addDaysJst } from "./jst";

export function sevenDayMovingAverage(
  minutesByDate: ReadonlyMap<string, number>,
  endDateJst: string,
): number {
  let total = 0;
  for (let offset = -6; offset <= 0; offset += 1) {
    const dateJst = addDaysJst(endDateJst, offset);
    total += minutesByDate.get(dateJst) ?? 0;
  }
  return total / 7;
}
