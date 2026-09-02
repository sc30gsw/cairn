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

//? 静穏時間は押し出し（Web Push）だけを止める。通知欄の行は静穏中でも作る（notifications.md §6.2）
export const QUIET_HOUR_RANGE = { max: 23, min: 0 } as const satisfies Record<string, number>;

export const QUIET_HOUR_DEFAULTS = { from: 22, to: 7 } as const satisfies Record<string, number>;

export const QUIET_HOUR_MESSAGE = `静穏時間は${String(QUIET_HOUR_RANGE.min)}〜${String(QUIET_HOUR_RANGE.max)}時から選んでください`;

export const NOTIFICATION_DEFAULTS = {
  enabled: false,
  eveningHourJst: 21,
  quietFromHourJst: QUIET_HOUR_DEFAULTS.from,
  quietToHourJst: QUIET_HOUR_DEFAULTS.to,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} as const satisfies NotificationSettingsDto;

//? from > to は日付をまたぐ窓（22→7）。from === to は「静穏なし」（24時間黙る状態を作らない）
export function isQuietHourJst(hour: number, from: number, to: number): boolean {
  if (from === to) {
    return false;
  }
  if (from < to) {
    return hour >= from && hour < to;
  }
  return hour >= from || hour < to;
}

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
