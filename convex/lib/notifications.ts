import type { Weekday } from "./catalog";
import { daysUntil, todayJst, weekdayFromDateJst } from "./jst";
import type { NotificationPayload, NotificationSettingsDto } from "./validators";

export const NOTIFICATION_KINDS = [
  "checkpointDeadline",
  "eveningUntouched",
  "weeklyTargetMiss",
] as const satisfies readonly string[];

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_PENDING_SOURCES = ["day", "preset"] as const satisfies readonly string[];

export type NotificationPendingSource = (typeof NOTIFICATION_PENDING_SOURCES)[number];

export const CHECKPOINT_NEAR_DAYS = 3;

export const CHECKPOINT_HOUR_JST = 8;
export const WEEKLY_MISS_HOUR_JST = 9;
export const WEEKLY_MISS_WEEKDAY = 6 satisfies Weekday;

export const EVENING_HOUR_RANGE = { max: 23, min: 18 } as const satisfies Record<string, number>;

export const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const NOTIFICATION_PURGE_BATCH = 200;

export const NOTIFICATION_LIST_LIMIT = 50;

export const NOTIFICATION_BODY_LINE_LIMIT = 5;

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const NOTIFICATION_DEFAULTS = {
  enabled: false,
  eveningHourJst: 21,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} as const satisfies NotificationSettingsDto;

export const EVENING_HOUR_MESSAGE = `夜の催促は${EVENING_HOUR_RANGE.min}〜${EVENING_HOUR_RANGE.max}時から選んでください`;

export function dueFixedTriggers(dateJst: string, hour: number) {
  return {
    checkpointDeadline: hour === CHECKPOINT_HOUR_JST,
    weeklyTargetMiss:
      hour === WEEKLY_MISS_HOUR_JST && weekdayFromDateJst(dateJst) === WEEKLY_MISS_WEEKDAY,
  };
}

export function isDeadlineNear(todayDateJst: string, deadline: string): boolean {
  const daysLeft = daysUntil(todayDateJst, deadline);
  return daysLeft >= 0 && daysLeft <= CHECKPOINT_NEAR_DAYS;
}

export function deadlineDaysLeft(todayDateJst: string, deadline: string): number {
  return daysUntil(todayDateJst, deadline);
}

export function hourJst(now: number): number {
  return new Date(now + JST_OFFSET_MS).getUTCHours();
}

export function nowJst(now: number) {
  return { dateJst: todayJst(new Date(now)), hourJst: hourJst(now) };
}

export function notificationDedupeKey(payload: NotificationPayload): string {
  if (payload.kind === "weeklyTargetMiss") {
    return `${payload.kind}:${payload.weekStartJst}`;
  }
  return `${payload.kind}:${payload.dateJst}`;
}
