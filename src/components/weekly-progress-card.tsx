import { Card, Group, Progress, Stack, Text } from "@mantine/core";

import { computeWeeklyProgress, type WeeklyProgressInput } from "~/lib/weekly-progress";

type WeeklyProgressCardProps = WeeklyProgressInput;

export function WeeklyProgressCard({
  minutesByDate,
  todayJst,
  weekEndJst,
  weeklyGoal,
}: WeeklyProgressCardProps) {
  const progress = computeWeeklyProgress({ minutesByDate, todayJst, weekEndJst, weeklyGoal });

  if (weeklyGoal === null) {
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
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm">
            実施日 {progress.doneDays}/{progress.goalDays} 日
          </Text>
          <Text c="dimmed" size="sm">
            1日 {weeklyGoal.dailyFloorMinutes}分以上
          </Text>
        </Group>
        <Progress aria-label="週間ゴール達成率" value={progress.percent} />
        <Text size="sm">
          今日 {progress.todayMinutes}分
          {progress.todayReached
            ? "（実施日に到達）"
            : `（あと ${weeklyGoal.dailyFloorMinutes - progress.todayMinutes}分で実施日）`}
        </Text>
        {progress.remainingDays > 0 ? (
          <Text c="dimmed" size="sm">
            残り {progress.remainingDays} 日 / 今週はあと {progress.daysLeft} 日
          </Text>
        ) : (
          <Text c="dimmed" size="sm">
            今週のゴールを達成しました。
          </Text>
        )}
        <Text c="dimmed" size="xs">
          {/*? 総分数は判定に使わない補助表示 */}
          今週の合計 {progress.weekMinutes}分
        </Text>
      </Stack>
    </Card>
  );
}
