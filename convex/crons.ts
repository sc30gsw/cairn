import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
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

export default crons;
