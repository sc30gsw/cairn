import { Card, Group, Stack, Text, Title } from "@mantine/core";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { MasteryGoal, OtherGoal } from "~/features/goals/types/goal";

type SimpleGoalCardProps = {
  goal: MasteryGoal | OtherGoal;
  onEdit: () => void;
  onRemove: () => void;
};

//? 習得 / その他は完了状態を持たない。終わったら削除する(v1)
export function SimpleGoalCard({ goal, onEdit, onRemove }: SimpleGoalCardProps) {
  return (
    <Card h="100%" padding="md">
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Title order={3}>{GOAL_TYPE_LABELS[goal.type]}</Title>
          <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
        </Group>
        <Text>{goal.content}</Text>
        {goal.type === "mastery" && <Text size="sm">基準: {goal.criterion}</Text>}
        {goal.type === "other" && goal.memo !== undefined && <Text size="sm">{goal.memo}</Text>}
        <Text c="dimmed" size="sm">
          {goal.deadline === undefined ? "期限なし" : `期限 ${goal.deadline}`}
        </Text>
      </Stack>
    </Card>
  );
}
