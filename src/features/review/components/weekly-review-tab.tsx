import { Anchor, Group, Stack } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { ShareCopy } from "~/components/share-copy";
import { WeeklyReviewDayTable } from "~/features/review/components/weekly-review-day-table";
import { WeeklyReviewSummaryCards } from "~/features/review/components/weekly-review-summary-cards";
import { WeeklyReviewTargets } from "~/features/review/components/weekly-review-targets";
import { WeeklyReviewWeekNav } from "~/features/review/components/weekly-review-week-nav";
import { useReviewView } from "~/features/review/hooks/use-review-view";
import {
  historyWeekAnalysisLink,
  monthDayLabel,
  weekdayShortLabel,
} from "~/features/review/lib/weekly-review-labels";
import { useWeeklyReview } from "~/hooks/review-queries";
import { dayPageLink } from "~/lib/board-day-links";

export function WeeklyReviewTab() {
  const { currentWeekStart, setWeek, today, weekStart } = useReviewView();
  const { data: review } = useWeeklyReview(weekStart, today);
  //? 掘りたい日は「週の中で記録が確定しうる最後の日」。今週なら今日、過去週なら日曜
  const editDateJst = review.isCurrentWeek ? today : review.weekEnd;

  return (
    <Stack gap="lg">
      <WeeklyReviewWeekNav
        currentWeekStart={currentWeekStart}
        onWeekChange={setWeek}
        weekEnd={review.weekEnd}
        weekStart={weekStart}
      />

      <WeeklyReviewSummaryCards
        activeDays={review.activeDays}
        confirmedMinutes={review.confirmedMinutes}
        digest={review.digest}
        elapsedDays={review.elapsedDays}
        previousActiveDays={review.previousActiveDays}
        previousConfirmedMinutes={review.previousConfirmedMinutes}
      />

      <WeeklyReviewTargets targets={review.targets} />

      <WeeklyReviewDayTable byDay={review.byDay} todayJst={today} />

      <ShareCopy
        emptyDescription="この週に確定した記録がありません。"
        markdown={review.shareMarkdown}
        title="共有文（週）"
      />

      <Group gap="md" wrap="wrap">
        <Anchor
          renderRoot={(props) => <Link {...props} {...historyWeekAnalysisLink(weekStart)} />}
          underline="hover"
        >
          この週を履歴で掘る
        </Anchor>
        <Anchor
          renderRoot={(props) => <Link {...props} {...dayPageLink(editDateJst, today)} />}
          underline="hover"
        >
          {monthDayLabel(editDateJst)}（{weekdayShortLabel(editDateJst)}）を編集
        </Anchor>
      </Group>
    </Stack>
  );
}
