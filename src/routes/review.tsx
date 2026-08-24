import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ReviewPage } from "~/features/review/components/review-page";
import {
  reviewSearchMiddlewares,
  ReviewSearchSchema,
} from "~/features/review/lib/review-route-search";

export const Route = createFileRoute("/review")({
  validateSearch: ReviewSearchSchema,
  search: {
    middlewares: reviewSearchMiddlewares,
  },
  component: ReviewRoute,
});

function ReviewRoute() {
  return (
    <OwnerGate>
      <ReviewPage />
    </OwnerGate>
  );
}
