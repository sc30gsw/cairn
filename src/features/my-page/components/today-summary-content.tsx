import { Card, Stack, Text, Title } from "@mantine/core";
import { daysUntil } from "~domain/jst";

import type { ExamGoal } from "~/features/goals/types/goal";
import { NUMERAL_FONT } from "~/lib/theme";

export type TodaySummaryTarget = {
  achieved: boolean;
};

type TodaySummaryContentProps = {
  examGoal: ExamGoal | undefined;
  targets: TodaySummaryTarget[];
  today: string;
};

export function TodaySummaryContent({ examGoal, targets, today }: TodaySummaryContentProps) {
  const remainingDays = examGoal === undefined ? null : daysUntil(today, examGoal.examDate);
  const achievedCount = targets.filter((target) => target.achieved).length;

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>今日の状況</Title>
        {examGoal === undefined ? (
          <Text c="dimmed" size="sm">
            本番目標を設定すると、試験日までの残り日数と今週の達成状況がここに表示されます。
          </Text>
        ) : (
          <>
            <Text>{examGoal.content}</Text>
            {remainingDays !== null && remainingDays >= 0 ? (
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
          </>
        )}
      </Stack>
    </Card>
  );
}
