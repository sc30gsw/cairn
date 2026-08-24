import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import { evaluateNotificationsRef, purgeExpiredNotificationsRef } from "./lib/notificationRefs";
import { autoStopTimersRef } from "./lib/rowTimerRefs";

const crons = cronJobs();

crons.daily(
  "purge expired trash",
  { hourUTC: 15, minuteUTC: 0 },
  internal.mutations.trash.purgeExpired.purgeExpired,
  {},
);

//? 15分という粗さが値を変えない: 加算値は TIMER_MAX_SEGMENT_MS 固定で、timerAutoStoppedAt は
//? 目印にしか使わない(docs/specs/study-timer.md §7.3)。
crons.interval("auto stop stale row timers", { minutes: 15 }, autoStopTimersRef, {});

crons.hourly(
  "purge expired avatar upload claims",
  { minuteUTC: 15 },
  internal.mutations.profile.purgeExpiredAvatarClaims.purgeExpiredAvatarClaims,
  {},
);

//? 通知の評価は毎時0分の1本だけ。3トリガーの「いま発火すべきか」は JST の暦日・時・曜日から
//? 純関数(dueFixedTriggers)で決める。UTC 換算を cron 定義に埋めない(#56 §8.1)。
//? minuteUTC: 0 は JST でも分0(JST は UTC+9:00 の固定オフセット、夏時間なし)。
crons.hourly("evaluate notifications", { minuteUTC: 0 }, evaluateNotificationsRef, {});

crons.daily(
  "purge expired notifications",
  { hourUTC: 15, minuteUTC: 30 },
  purgeExpiredNotificationsRef,
  {},
);

export default crons;
