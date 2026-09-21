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

export function clockArcPath(
  cx: number,
  cy: number,
  radius: number,
  startMinute: number,
  endMinute: number,
): string {
  const startAngle = (minuteToAngle(startMinute) * Math.PI) / 180;
  const endAngle = (minuteToAngle(endMinute) * Math.PI) / 180;
  const largeArc = endMinute - startMinute > CLOCK_MINUTES_PER_DAY / 2 ? 1 : 0;
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
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
