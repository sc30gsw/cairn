import { CALENDAR_SYNC_WINDOW } from "../../lib/calendarSync";
import { addDaysJst } from "../../lib/jst";
import { ALL_DAY_START_TIME, scheduleInstantToRfc3339 } from "./instant";

export type SyncWindow = {
  //? Google へ渡す RFC 3339
  timeMax: string;
  timeMin: string;
  //? 写しを残す startAt の範囲（schedule instant、終端は排他的）
  startAtMaxExclusive: string;
  startAtMin: string;
};

//? 外部予定の写しを持つ期間（過去 30 日〜未来 90 日）。純関数
export function syncWindow(todayJst: string): SyncWindow {
  const startAtMin = `${addDaysJst(todayJst, -CALENDAR_SYNC_WINDOW.pastDays)} ${ALL_DAY_START_TIME}`;
  const startAtMaxExclusive = `${addDaysJst(todayJst, CALENDAR_SYNC_WINDOW.futureDays + 1)} ${ALL_DAY_START_TIME}`;
  return {
    startAtMaxExclusive,
    startAtMin,
    timeMax: scheduleInstantToRfc3339(startAtMaxExclusive),
    timeMin: scheduleInstantToRfc3339(startAtMin),
  };
}

export function isWithinWindow(startAt: string, window: SyncWindow): boolean {
  return startAt >= window.startAtMin && startAt < window.startAtMaxExclusive;
}
