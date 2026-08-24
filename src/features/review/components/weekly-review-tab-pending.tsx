import { Group, Stack, Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

import { ShareCopy } from "~/components/share-copy";
import { WeeklyReviewDayTable } from "~/features/review/components/weekly-review-day-table";
import { WeeklyReviewSummaryCards } from "~/features/review/components/weekly-review-summary-cards";
import { WeeklyReviewTargets } from "~/features/review/components/weekly-review-targets";
import { reviewShimmerWeekly } from "~/features/review/lib/review-shimmer-template";
import { weekRangeLabel } from "~/features/review/lib/weekly-review-labels";
import { NUMERAL_FONT } from "~/lib/theme";

//? WeeklyReviewTab 自身を fallback に入れない(再サスペンドする)。構造モックだけを描く
export function WeeklyReviewTabPending() {
  return (
    <Shimmer loading>
      <Stack gap="lg">
        <Group align="center" gap="xs" wrap="nowrap">
          <Text ff={NUMERAL_FONT} fw={500}>
            {weekRangeLabel(reviewShimmerWeekly.weekStart, reviewShimmerWeekly.weekEnd)}
          </Text>
        </Group>
        <WeeklyReviewSummaryCards
          activeDays={reviewShimmerWeekly.activeDays}
          confirmedMinutes={reviewShimmerWeekly.confirmedMinutes}
          digest={reviewShimmerWeekly.digest}
          elapsedDays={reviewShimmerWeekly.elapsedDays}
          previousActiveDays={reviewShimmerWeekly.previousActiveDays}
          previousConfirmedMinutes={reviewShimmerWeekly.previousConfirmedMinutes}
        />
        <WeeklyReviewTargets targets={reviewShimmerWeekly.targets} />
        <WeeklyReviewDayTable
          byDay={reviewShimmerWeekly.byDay}
          todayJst={reviewShimmerWeekly.weekEnd}
        />
        <ShareCopy markdown={reviewShimmerWeekly.shareMarkdown} title="共有文（週）" />
      </Stack>
    </Shimmer>
  );
}
