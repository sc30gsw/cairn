import { createFileRoute, redirect } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { BoardPage } from "~/features/board/components/board-page";
import { boardSearchMiddlewares, BoardSearchSchema } from "~/features/board/lib/board-route-search";

export const Route = createFileRoute("/board")({
  validateSearch: BoardSearchSchema,
  search: {
    middlewares: boardSearchMiddlewares,
  },
  beforeLoad: ({ search }) => {
    if (search.tab !== "schedule") {
      return;
    }
    throw redirect({
      replace: true,
      search: {
        calendarSync: search.calendarSync,
        date: search.date,
        month: search.month,
        view: search.view,
        week: search.week,
      },
      to: "/plan",
    });
  },
  component: BoardRoute,
});

function BoardRoute() {
  return (
    <OwnerGate>
      <BoardPage />
    </OwnerGate>
  );
}
