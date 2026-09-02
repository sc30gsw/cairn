import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { calendarFeedTokenFromPath } from "../lib/calendarFeedToken";
import { calendarFeedResponse } from "../services/calendarFeed/respond";

//? GET /calendar/<token>.ics — 外部カレンダーが定期的に取りに来る。読み1回・外部呼び出しなし
export const calendarFeed = httpAction(async (ctx, request) => {
  const token = calendarFeedTokenFromPath(new URL(request.url).pathname);
  const feed =
    token === null
      ? null
      : await ctx.runQuery(internal.queries.calendarFeed.feedByToken.feedByToken, { token });
  return calendarFeedResponse(feed, Date.now());
});
