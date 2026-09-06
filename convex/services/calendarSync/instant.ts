import { addDaysJst } from "../../lib/jst";

//? schedule instant（`YYYY-MM-DD HH:mm:ss`、暗黙に JST）と Google の RFC 3339 / 終日 date の相互変換。純関数

const JST_OFFSET = "+09:00";

const JST_PARTS = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? "00";
}

export function scheduleInstantToRfc3339(instant: string): string {
  return `${instant.slice(0, 10)}T${instant.slice(11)}${JST_OFFSET}`;
}

export function scheduleInstantToMs(instant: string): number {
  return new Date(scheduleInstantToRfc3339(instant)).getTime();
}

export function msToScheduleInstant(ms: number): string {
  const parts = JST_PARTS.formatToParts(new Date(ms));
  const hour = part(parts, "hour");
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")} ${hour === "24" ? "00" : hour}:${part(parts, "minute")}:${part(parts, "second")}`;
}

export function rfc3339ToScheduleInstant(dateTime: string): string | null {
  const ms = new Date(dateTime).getTime();
  return Number.isNaN(ms) ? null : msToScheduleInstant(ms);
}

export const ALL_DAY_START_TIME = "00:00:00";

const ALL_DAY_END_TIME = "23:59:59";

export function allDayRange(
  startDate: string,
  endDateExclusive: string | undefined,
): {
  endAt: string;
  startAt: string;
} {
  const lastDay =
    endDateExclusive === undefined || endDateExclusive <= startDate
      ? startDate
      : addDaysJst(endDateExclusive, -1);
  return { endAt: `${lastDay} ${ALL_DAY_END_TIME}`, startAt: `${startDate} ${ALL_DAY_START_TIME}` };
}
