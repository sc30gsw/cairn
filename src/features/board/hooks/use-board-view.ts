import { getRouteApi } from "@tanstack/react-router";

import type { BoardSearch, BoardTab } from "~/features/board/schemas/board-search-schema";

/** `/board` 専用 — BoardPage 配下からのみ import すること */
const boardRoute = getRouteApi("/board");

export function deriveBoardView(search: BoardSearch) {
  const tab: BoardTab = search.tab ?? "kanban";
  return { tab };
}

export function useBoardView() {
  const search = boardRoute.useSearch();
  const navigate = boardRoute.useNavigate();
  const view = deriveBoardView(search);

  return {
    ...view,
    setTab: (tab: BoardTab) => {
      void navigate({
        search: (current) => ({
          ...current,
          tab: tab === "kanban" ? undefined : tab,
        }),
      });
    },
  };
}
