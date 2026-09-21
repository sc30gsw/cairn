import { parseMinuteOfDay } from "~domain/planEvent";

import type { PlanEventDto } from "~/features/plan/types/plan";

export const CLOCK_MINUTES_PER_DAY = 1440;

const JST_CLOCK_PARTS = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

export function jstMinuteOfDay(now: Date): number {
  const parts = JST_CLOCK_PARTS.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

export function minuteToAngle(minute: number): number {
  return (minute / CLOCK_MINUTES_PER_DAY) * 360 - 90;
}

export function clockPoint(
  cx: number,
  cy: number,
  radius: number,
  minute: number,
): { x: number; y: number } {
  const angle = (minuteToAngle(minute) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function clockPiePath(
  cx: number,
  cy: number,
  radius: number,
  startMinute: number,
  endMinute: number,
): string {
  const span = endMinute - startMinute;
  if (span >= CLOCK_MINUTES_PER_DAY) {
    return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
  }
  const largeArc = span > CLOCK_MINUTES_PER_DAY / 2 ? 1 : 0;
  const start = clockPoint(cx, cy, radius, startMinute);
  const end = clockPoint(cx, cy, radius, endMinute);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function paintsClockArc(event: PlanEventDto): boolean {
  return (
    event.itemId !== undefined &&
    event.recordState.kind === "materialized" &&
    event.recordState.status === "確定"
  );
}

export function eventArcMinutes(event: PlanEventDto): { endMinute: number; startMinute: number } {
  return {
    endMinute: parseMinuteOfDay(event.endTime, "end"),
    startMinute: parseMinuteOfDay(event.startTime, "start"),
  };
}
