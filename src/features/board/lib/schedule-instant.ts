import dayjs from "dayjs";

const SCHEDULE_INSTANT_FORMAT = "YYYY-MM-DD HH:mm:ss";

export function dateToScheduleInstant(value: Date): string {
  return dayjs(value).format(SCHEDULE_INSTANT_FORMAT);
}

export function scheduleInstantToDate(value: string): Date {
  return dayjs(value, SCHEDULE_INSTANT_FORMAT).toDate();
}
