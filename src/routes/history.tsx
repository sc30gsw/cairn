import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { HistoryPage } from "~/features/history/components/history-page";
import {
  historySearchMiddlewares,
  HistorySearchSchema,
} from "~/features/history/lib/history-route-search";

export const Route = createFileRoute("/history")({
  validateSearch: HistorySearchSchema,
  search: {
    middlewares: historySearchMiddlewares,
  },
  component: HistoryRoute,
});

function HistoryRoute() {
  return (
    <OwnerGate>
      <HistoryPage />
    </OwnerGate>
  );
}
