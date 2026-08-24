//* 通知(#56)のドメイン定数と純関数。Convex ランタイムを import しないので ~domain/notifications
//? としてフロントからも読める。時を読む関数(hourJst / nowJst)は mutation / action からだけ呼ぶ。

import type { Weekday } from "./catalog";
import { daysUntil, todayJst, weekdayFromDateJst } from "./jst";
//? 型だけの import。実行時には消えるので validators.ts との循環にならない(§5.6)。
import type { NotificationPayload, NotificationSettingsDto } from "./validators";

//* 通知の種類。Convex validator / Valibot / UI が共有する固定タプル(CVX-16)。
export const NOTIFICATION_KINDS = [
  "checkpointDeadline",
  "eveningUntouched",
  "weeklyTargetMiss",
] as const satisfies readonly string[];

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

//* 夜の催促が数える対象がどこから来たか。日が無いときはプリセットの行数を数える(§4.2)。
export const NOTIFICATION_PENDING_SOURCES = ["day", "preset"] as const satisfies readonly string[];

export type NotificationPendingSource = (typeof NOTIFICATION_PENDING_SOURCES)[number];

//* 期限接近の窓。残り 0〜3 日を「接近」とする。負(期限超過)は含めない。
export const CHECKPOINT_NEAR_DAYS = 3;

//* 固定時刻トリガーの発火時(JST)。cron は毎時走り、ここと一致した回だけ評価する。
export const CHECKPOINT_HOUR_JST = 8;
export const WEEKLY_MISS_HOUR_JST = 9;
//? 土曜。週は月曜始まりなので、土曜朝はまだ2日残っている(§4.2)。
//? 曜日の値域は catalog.ts の Weekday(0=日〜6=土)。数値を裸で置かず型で縛る(CVX-16)。
export const WEEKLY_MISS_WEEKDAY = 6 satisfies Weekday;

//* 夜の催促に選べる時刻。
export const EVENING_HOUR_RANGE = { max: 23, min: 18 } as const satisfies Record<string, number>;

//* 通知の保持期間。ゴミ箱(TRASH_TTL_MS)と同じ30日。
export const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

//* 1回の purge で読む上限。トランザクションを短く保つ(CVX-11 の .take による上限)。
export const NOTIFICATION_PURGE_BATCH = 200;

//* 通知欄が返す最大件数。理論上の在庫は「30日 × 最大3通/日」で90件(§6.1)。
export const NOTIFICATION_LIST_LIMIT = 50;

//* 本文に並べる明細の最大行数。超えた分は「…他N件」に畳む(§5.2)。
export const NOTIFICATION_BODY_LINE_LIMIT = 5;

//* JST は UTC+9:00 固定・夏時間なし。時の算出は Intl を使わずこのオフセットで行う。
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

//* 設定の既定値。行が無い所有者に query が**そのまま**返す値なので、
//? 形は notificationSettingsDtoValidator と1対1にしておく(services 側で足す値を作らない)。
export const NOTIFICATION_DEFAULTS = {
  enabled: false,
  eveningHourJst: 21,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} as const satisfies NotificationSettingsDto;

//* 検証メッセージ。services と Valibot が同じ文言を共有する(CVX-16)。
export const EVENING_HOUR_MESSAGE = `夜の催促は${EVENING_HOUR_RANGE.min}〜${EVENING_HOUR_RANGE.max}時から選んでください`;

//* いま固定時刻トリガーの発火時刻か。cron の UTC 換算を関数側に閉じ込める。
export function dueFixedTriggers(dateJst: string, hour: number) {
  return {
    checkpointDeadline: hour === CHECKPOINT_HOUR_JST,
    weeklyTargetMiss:
      hour === WEEKLY_MISS_HOUR_JST && weekdayFromDateJst(dateJst) === WEEKLY_MISS_WEEKDAY,
  };
}

//* 期限接近の窓に入っているか(純関数、CVX-09)。
export function isDeadlineNear(todayDateJst: string, deadline: string): boolean {
  const daysLeft = daysUntil(todayDateJst, deadline);
  return daysLeft >= 0 && daysLeft <= CHECKPOINT_NEAR_DAYS;
}

export function deadlineDaysLeft(todayDateJst: string, deadline: string): number {
  return daysUntil(todayDateJst, deadline);
}

//* JST の時(0〜23)。mutation / action からだけ呼ぶ。query では呼ばない(CVX-14)。
//? JST は固定オフセットなので、UTC に +9h してから getUTCHours() で厳密に出る。
export function hourJst(now: number): number {
  return new Date(now + JST_OFFSET_MS).getUTCHours();
}

//* 「いま」の JST 座標。評価器は先頭で1回だけ時計を読み、以降はこの値を配る。
export function nowJst(now: number) {
  return { dateJst: todayJst(new Date(now)), hourJst: hourJst(now) };
}

//* 頻度上限そのもの。{kind}:{発火単位} の1本キーで「同じ事実から二度作らない」を保証する(§6.1)。
//? カウンタもレート制限機構も持たない。粒度がそのまま上限になる。
export function notificationDedupeKey(payload: NotificationPayload): string {
  if (payload.kind === "weeklyTargetMiss") {
    return `${payload.kind}:${payload.weekStartJst}`;
  }
  return `${payload.kind}:${payload.dateJst}`;
}
