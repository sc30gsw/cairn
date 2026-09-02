import { Badge, Tooltip } from "@mantine/core";
import type { RowReviewDto } from "~domain/validators";

import { reviewBadgeLabel, reviewBadgeTooltip } from "~/lib/review-ui";

//? 復習の印。元の記録には次の期日、並んだ復習の記録には何回目かを出す。ストリークや遅れは出さない
export function ReviewBadge({ review }: Record<"review", RowReviewDto>) {
  if (review === null) {
    return null;
  }
  return (
    <Tooltip label={reviewBadgeTooltip(review)} withArrow>
      <Badge color="orange" size="sm" variant={review.kind === "review" ? "filled" : "light"}>
        {reviewBadgeLabel(review)}
      </Badge>
    </Tooltip>
  );
}
