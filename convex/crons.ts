import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "purge expired trash",
  "0 15 * * *",
  internal.mutations.trash.purgeExpired.purgeExpired,
  {},
);

//? 15分という粗さが値を変えない: 加算値は TIMER_MAX_SEGMENT_MS 固定で、timerAutoStoppedAt は
//? 目印にしか使わない(docs/specs/study-timer.md §7.3)。
crons.interval(
  "auto stop stale row timers",
  { minutes: 15 },
  internal.mutations.rows.autoStopTimers.autoStopTimers,
  {},
);

crons.cron(
  "purge expired avatar upload claims",
  "15 * * * *",
  internal.mutations.profile.purgeExpiredAvatarClaims.purgeExpiredAvatarClaims,
  {},
);

//? 通知の評価は毎時0分の1本だけ。3トリガーの「いま発火すべきか」は JST の暦日・時・曜日から
//? 純関数(dueFixedTriggers)で決める。UTC 換算を cron 定義に埋めない(#56 §8.1)。
//? minuteUTC: 0 は JST でも分0(JST は UTC+9:00 の固定オフセット、夏時間なし)。
crons.cron(
  "evaluate notifications",
  "0 * * * *",
  internal.mutations.notifications.evaluate.evaluate,
  {},
);

crons.cron(
  "purge expired notifications",
  "30 15 * * *",
  internal.mutations.notifications.purgeExpired.purgeExpired,
  {},
);

export default crons;
