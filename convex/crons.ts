import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "purge expired trash",
  "0 15 * * *",
  internal.mutations.trash.purgeExpired.purgeExpired,
  {},
);

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

//? Google カレンダーとの全件突き合わせ（差分取得 + 取りこぼしの送信）。push 通知は v1 では使わない（ADR-0017）
crons.cron(
  "sync google calendars",
  "20 * * * *",
  internal.actions.calendarSync.syncAll.syncAll,
  {},
);

export default crons;
