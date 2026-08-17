import { Card, Group, Stack, Text, Title } from "@mantine/core";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { PaceGoal } from "~/features/goals/types/goal";

type PaceGoalCardProps = {
  goal: PaceGoal;
  onEdit: () => void;
  onRemove: () => void;
};

export function PaceGoalCard({ goal, onEdit, onRemove }: PaceGoalCardProps) {
  return (
    <Card padding="md">
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Title order={3}>{GOAL_TYPE_LABELS.pace}</Title>
          <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
        </Group>
        <Text>{goal.content}</Text>
        <Text c="dimmed" size="sm">
          週 {goal.daysPerWeek} 日 × 1日あたり最低 {goal.dailyFloorMinutes} 分
        </Text>
      </Stack>
    </Card>
  );
}
