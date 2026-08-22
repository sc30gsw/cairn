import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired trash",
  { hourUTC: 15, minuteUTC: 0 },
  internal.mutations.trash.purgeExpired.purgeExpired,
  {},
);

crons.hourly(
  "purge expired avatar upload claims",
  { minuteUTC: 15 },
  internal.mutations.profile.purgeExpiredAvatarClaims.purgeExpiredAvatarClaims,
  {},
);

export default crons;
