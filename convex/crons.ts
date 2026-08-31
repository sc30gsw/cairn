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

export default crons;
