import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { BoardPage } from "~/features/board/components/board-page";
import { boardSearchMiddlewares, BoardSearchSchema } from "~/features/board/lib/board-route-search";

export const Route = createFileRoute("/board")({
  validateSearch: BoardSearchSchema,
  search: {
    middlewares: boardSearchMiddlewares,
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
