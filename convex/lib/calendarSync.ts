//? カレンダー同期（ADR-0017）のドメイン定数。Google に出すもの・戻すもの・写しの期間はここが SSoT

export const GOOGLE_PROVIDER_ID = "google";

//? 最小権限: 全カレンダーの予定の読み書き + カレンダー一覧の読み取り（表示カレンダーの選択に要る）
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const satisfies readonly string[];

//? 書き込み先は接続アカウントのメインカレンダー（Q6 の決定）
export const PRIMARY_CALENDAR_ID = "primary";

//? 外部予定の写しを持つ期間（Q13 の決定）。範囲外は写しから消す
export const CALENDAR_SYNC_WINDOW = { futureDays: 90, pastDays: 30 } as const satisfies Record<
  string,
  number
>;

//? 差分同期の期間は初回全件の日で固定される。これだけ日が進んだら全件を取り直して期間を動かす
export const CALENDAR_SYNC_FULL_RESYNC_DAYS = 7;

export const CALENDAR_SYNC_STATUSES = [
  "ok",
  "needsReauth",
  "error",
] as const satisfies readonly string[];

export type CalendarSyncStatus = (typeof CALENDAR_SYNC_STATUSES)[number];

//? Google に出す元: 目標（本番日・期限の終日）と予定（時刻つき）
export const CALENDAR_SYNC_SOURCE_KINDS = ["goal", "block"] as const satisfies readonly string[];

export type CalendarSyncSourceKind = (typeof CALENDAR_SYNC_SOURCE_KINDS)[number];

export const EXAM_EVENT_PREFIX = "本番";

export const CHECKPOINT_EVENT_PREFIX = "期限";

//? 同期の失敗は数回だけ退避して再試行し、諦めたら状態を error にして UI に出す
export const CALENDAR_SYNC_RETRY_DELAYS_MS = [
  30_000, 120_000, 600_000,
] as const satisfies readonly number[];

export const CALENDAR_SYNC_NOT_CONNECTED_MESSAGE = "Google カレンダーが接続されていません";

export const CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE =
  "Google の権限が切れています。マイページからもう一度接続してください";

export const CALENDAR_SYNC_SCOPE_MISSING_MESSAGE =
  "Google カレンダーの権限が付いていません。連携をやり直してください";

export const EXTERNAL_EVENT_NOT_FOUND_MESSAGE = "外部予定が見つかりません";
