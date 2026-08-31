import { getRouteApi } from "@tanstack/react-router";

export const indexDayRoute = getRouteApi("/");

export const datedDayRoute = getRouteApi("/days/$dateJst");
