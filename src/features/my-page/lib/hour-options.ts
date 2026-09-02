import { EVENING_HOUR_RANGE, QUIET_HOUR_RANGE } from "~domain/notifications";

export type HourOption = {
  label: string;
  value: string;
};

export function hourOptions(min: number, max: number): HourOption[] {
  const options: HourOption[] = [];
  for (let hour = min; hour <= max; hour += 1) {
    options.push({ label: `${String(hour)}時`, value: String(hour) });
  }
  return options;
}

export function eveningHourOptions(): HourOption[] {
  return hourOptions(EVENING_HOUR_RANGE.min, EVENING_HOUR_RANGE.max);
}

export function quietHourOptions(): HourOption[] {
  return hourOptions(QUIET_HOUR_RANGE.min, QUIET_HOUR_RANGE.max);
}
