import { convexQuery } from "@convex-dev/react-query";
import { Card, Stack, Text, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { daysUntil, mondayOfWeek, todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { ExamGoal } from "~/features/goals/types/goal";
import { NUMERAL_FONT } from "~/lib/theme";

export function TodaySummarySection() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: goals } = useSuspenseQuery(convexQuery(api.queries.goals.list.list, {}));
  const { data: targets } = useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst: weekStart }),
  );

  const examGoal = goals.find((goal): goal is ExamGoal => goal.type === "exam");
  if (examGoal === undefined) {
    return null;
  }

  const remainingDays = daysUntil(today, examGoal.examDate);
  const achievedCount = targets.filter((target) => target.achieved).length;

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>今日の状況</Title>
        <Text>{examGoal.content}</Text>
        {remainingDays >= 0 ? (
          <Title ff={NUMERAL_FONT} order={2}>
            {remainingDays}
            <Text c="dimmed" component="span" ml={4} size="md">
              日
            </Text>
          </Title>
        ) : (
          <Text c="dimmed">本番日を過ぎています。</Text>
        )}
        <Text size="sm">
          今週の週間ターゲット: {achievedCount}/{targets.length} 達成
        </Text>
      </Stack>
    </Card>
  );
}
