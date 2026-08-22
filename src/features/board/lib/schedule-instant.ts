import { isScheduleInstant } from "~domain/scheduleInstant";

const JST_TIME_ZONE = "Asia/Tokyo";

const jstScheduleInstantFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: JST_TIME_ZONE,
  year: "numeric",
});

function formatPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function dateToScheduleInstant(value: Date): string {
  const parts = jstScheduleInstantFormatter.formatToParts(value);

  return `${formatPart(parts, "year")}-${formatPart(parts, "month")}-${formatPart(parts, "day")} ${formatPart(parts, "hour")}:${formatPart(parts, "minute")}:${formatPart(parts, "second")}`;
}

export function formatScheduleTimeLabel(value: string | Date): string {
  const instant = typeof value === "string" ? value : dateToScheduleInstant(value);
  return instant.slice(11, 16);
}

export function scheduleInstantToDate(value: string): Date {
  if (!isScheduleInstant(value)) {
    throw new Error(`Invalid schedule instant: ${value}`);
  }

  const date = value.slice(0, 10);
  const time = value.slice(11);
  return new Date(`${date}T${time}+09:00`);
}
