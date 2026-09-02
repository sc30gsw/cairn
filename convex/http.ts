import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { CALENDAR_FEED_PATH_PREFIX, calendarFeedTokenFromPath } from "./lib/calendarFeedToken";
import { calendarFeedResponse } from "./services/calendarFeed/respond";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

//? GET /calendar/<token>.ics — 外部カレンダーが定期的に取りに来る（docs/specs/calendar-feed.md）。
//? トークンはパス末尾で受けて手で解く。読み1回だけで外部呼び出しは無いので Convex ランタイムのまま
//? （`convex/actions/` は Node ランタイムを選ぶ非推奨の置き場所で、全ファイルに "use node" を要求される）
const calendarFeed = httpAction(async (ctx, request) => {
  const token = calendarFeedTokenFromPath(new URL(request.url).pathname);
  const feed =
    token === null
      ? null
      : await ctx.runQuery(internal.queries.calendarFeed.feedByToken.feedByToken, { token });
  return calendarFeedResponse(feed, Date.now());
});

http.route({ handler: calendarFeed, method: "GET", pathPrefix: CALENDAR_FEED_PATH_PREFIX });

export default http;
