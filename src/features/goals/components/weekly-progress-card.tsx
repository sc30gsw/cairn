import { Card, Progress, Stack, Text } from "@mantine/core";

import { computeWeeklyProgress } from "~/lib/weekly-progress";

type WeeklyProgressCardProps = {
  todayJst: string;
  volumeMinutes: number;
  weekEndJst: string;
  weeklyGoalMinutes: null | number;
};

export function WeeklyProgressCard({
  todayJst,
  volumeMinutes,
  weekEndJst,
  weeklyGoalMinutes,
}: WeeklyProgressCardProps) {
  const progress = computeWeeklyProgress({
    todayJst,
    volumeMinutes,
    weekEndJst,
    weeklyGoalMinutes,
  });

  if (weeklyGoalMinutes === null) {
    return (
      <Card padding="md">
        <Text c="dimmed" size="sm">
          週間ゴールが未設定です。
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <Stack gap="xs">
        <Text fw={600} size="sm">
          週間ゴール {progress.percent}%
        </Text>
        <Progress aria-label="週間ゴール達成率" value={progress.percent} />
        <Text size="sm">
          実績 {volumeMinutes}分 / ゴール {weeklyGoalMinutes}分
        </Text>
        {progress.remaining > 0 ? (
          <Text c="dimmed" size="sm">
            残り {progress.remaining}分 / あと {progress.daysLeft} 日 → 1日約 {progress.dailyNeeded} 分
          </Text>
        ) : (
          <Text c="dimmed" size="sm">
            今週のゴールを達成しました。
          </Text>
        )}
      </Stack>
    </Card>
  );
}
