import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired trash",
  { hourUTC: 15, minuteUTC: 0 },
  internal.mutations.trash.purgeExpired.purgeExpired,
  {},
);

export default crons;
