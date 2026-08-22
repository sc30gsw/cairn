import { getRouteApi } from "@tanstack/react-router";

/** `/board` 専用 — BoardPage 配下からのみ import すること */
export const boardRoute = getRouteApi("/board");
