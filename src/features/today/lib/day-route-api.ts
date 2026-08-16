import { getRouteApi } from "@tanstack/react-router";

/** `/` 専用 — `TodayDayPage` からのみ import すること */
export const indexDayRoute = getRouteApi("/");

/** `/days/$dateJst` 専用 — `DatedDayPage` からのみ import すること */
export const datedDayRoute = getRouteApi("/days/$dateJst");
