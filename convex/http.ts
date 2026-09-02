import { httpRouter } from "convex/server";

import { calendarFeed } from "./actions/calendarFeed";
import { authComponent, createAuth } from "./auth";
import { CALENDAR_FEED_PATH_PREFIX } from "./lib/calendarFeedToken";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

//? カレンダー購読フィード（docs/specs/calendar-feed.md）。トークンはパス末尾で受けて手で解く
http.route({ handler: calendarFeed, method: "GET", pathPrefix: CALENDAR_FEED_PATH_PREFIX });

export default http;
