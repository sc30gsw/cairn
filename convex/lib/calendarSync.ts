export const GOOGLE_PROVIDER_ID = "google";

export const GOOGLE_CALENDAR_SCOPE = {
  calendarList: "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  readEvents: "https://www.googleapis.com/auth/calendar.events.readonly",
  writeEvents: "https://www.googleapis.com/auth/calendar.events",
} as const satisfies Record<string, string>;

export const GOOGLE_CALENDAR_READ_SCOPES = [
  GOOGLE_CALENDAR_SCOPE.calendarList,
  GOOGLE_CALENDAR_SCOPE.readEvents,
] as const satisfies readonly string[];

export const GOOGLE_CALENDAR_WRITE_SCOPES = [
  ...GOOGLE_CALENDAR_READ_SCOPES,
  GOOGLE_CALENDAR_SCOPE.writeEvents,
] as const satisfies readonly string[];

export const GOOGLE_WRITABLE_ACCESS_ROLES = [
  "owner",
  "writer",
  "writerWithoutPrivateAccess",
] as const satisfies readonly string[];

export function canWriteCalendar(accessRole: string | undefined): boolean {
  return GOOGLE_WRITABLE_ACCESS_ROLES.some((role) => role === accessRole);
}

export const CALENDAR_AUTH_PURPOSES = ["read", "write"] as const satisfies readonly string[];

export type CalendarAuthPurpose = (typeof CALENDAR_AUTH_PURPOSES)[number];

export const CALENDAR_AUTH_REQUEST_STATES = [
  "pending",
  "authorized",
  "consumed",
] as const satisfies readonly string[];

export type CalendarAuthRequestState = (typeof CALENDAR_AUTH_REQUEST_STATES)[number];

export const CALENDAR_REQUEST_ID_KEY = "calendarRequestId";

export const CALENDAR_SYNC_SOURCE_PHASES = [
  "goals",
  "blocks",
  "links",
] as const satisfies readonly string[];

export type CalendarSyncSourcePhase = (typeof CALENDAR_SYNC_SOURCE_PHASES)[number];

export const PRIMARY_CALENDAR_ID = "primary";

export const CALENDAR_SYNC_WINDOW = { futureDays: 90, pastDays: 30 } as const satisfies Record<
  string,
  number
>;

export const CALENDAR_SYNC_FULL_RESYNC_DAYS = 7;

export const CALENDAR_SYNC_STATUSES = [
  "ok",
  "needsReauth",
  "error",
] as const satisfies readonly string[];

export type CalendarSyncStatus = (typeof CALENDAR_SYNC_STATUSES)[number];

export const CALENDAR_SYNC_SOURCE_KINDS = ["goal", "block"] as const satisfies readonly string[];

export type CalendarSyncSourceKind = (typeof CALENDAR_SYNC_SOURCE_KINDS)[number];

export const EXAM_EVENT_PREFIX = "本番";

export const CHECKPOINT_EVENT_PREFIX = "期限";

export const CALENDAR_SYNC_RETRY_DELAYS_MS = [
  30_000, 120_000, 600_000,
] as const satisfies readonly number[];

export const CALENDAR_SYNC_NOT_CONNECTED_MESSAGE = "Google カレンダーが接続されていません";

export const CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE =
  "Google の権限が切れています。マイページからもう一度接続してください";

export const CALENDAR_SYNC_SCOPE_MISSING_MESSAGE =
  "Google カレンダーの権限が付いていません。連携をやり直してください";

export const EXTERNAL_EVENT_NOT_FOUND_MESSAGE = "外部予定が見つかりません";

export const CALENDAR_SYNC_PRIMARY_MISSING_MESSAGE =
  "Google アカウントにメインカレンダーが見つかりませんでした";

export const CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE =
  "Google カレンダー側の予定を一部消せませんでした。少し待ってからもう一度解除してください";

export const CALENDAR_OUTPUT_CHANGE_STALLED_MESSAGE =
  "Cairn の予定の移動を完了できませんでした。元の接続が見つからない予定があります。連携を確認してから移動を再開してください";
