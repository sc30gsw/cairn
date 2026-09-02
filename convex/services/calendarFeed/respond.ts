import { buildIcs } from "../../lib/ics";
import type { CalendarFeedDto } from "../../lib/validators";

export const CALENDAR_FEED_NOT_FOUND_BODY = "not found";

//? Response の組み立てだけ。トークンが無効なら 404（W3C TAG の capability URL の推奨）
export function calendarFeedResponse(feed: CalendarFeedDto, nowMs: number): Response {
  if (feed === null) {
    return new Response(CALENDAR_FEED_NOT_FOUND_BODY, {
      headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
      status: 404,
    });
  }
  return new Response(buildIcs(feed.events, nowMs), {
    headers: {
      "cache-control": "private, max-age=3600",
      "content-type": "text/calendar; charset=utf-8",
    },
    status: 200,
  });
}
