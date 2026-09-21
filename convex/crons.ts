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

crons.cron(
  "sync google calendars",
  "0 5,17 * * *",
  internal.actions.calendarSync.syncAll.syncAll,
  {},
);

crons.cron(
  "apply forgotten plan to empty new days",
  "0 15 * * *",
  internal.mutations.planTemplates.applyForgottenToNewDays.applyForgottenToNewDays,
  {},
);

crons.cron(
  "notify missing tomorrow plan",
  "30 9 * * *",
  internal.mutations.notifications.notifyMissingTomorrowPlan.notifyMissingTomorrowPlan,
  {},
);

export default crons;
