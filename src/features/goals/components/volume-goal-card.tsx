import { Field, Form, useForm } from "@formisch/react";
import {
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import { VolumeProgressSchema } from "~/features/goals/schemas/volume-progress-schema";
import type { VolumeGoal } from "~/features/goals/types/goal";

type VolumeGoalCardProps = {
  goal: VolumeGoal;
  onEdit: () => void;
  onRemove: () => void;
  onSetProgress: (currentAmount: number) => void;
};

export function VolumeGoalCard({ goal, onEdit, onRemove, onSetProgress }: VolumeGoalCardProps) {
  const form = useForm({
    initialInput: { currentAmount: goal.currentAmount },
    schema: VolumeProgressSchema,
  });
  const percent =
    goal.targetAmount <= 0
      ? 0
      : Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

  return (
    <Card h="100%" padding="md">
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Title order={3}>{GOAL_TYPE_LABELS.volume}</Title>
          <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
        </Group>
        <Text>{goal.content}</Text>
        <Progress aria-label={`${goal.content}の進捗`} value={percent} />
        <Text size="sm">
          {goal.currentAmount} / {goal.targetAmount}
          {goal.unit}（{percent}%）
        </Text>
        <Text c="dimmed" size="sm">
          期限 {goal.deadline}
        </Text>
        <Form of={form} onSubmit={(output) => onSetProgress(output.currentAmount)}>
          <Grid align="flex-start" gap="sm">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Field of={form} path={["currentAmount"]}>
                {(field) => (
                  <NumberInput
                    {...field.props}
                    aria-label={`${goal.content}の現在量`}
                    error={field.errors?.[0]}
                    label=" "
                    min={0}
                    onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                    suffix={` ${goal.unit}`}
                    value={field.input ?? ""}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <LabelAlignedCell>
                <Button fullWidth type="submit">
                  {goal.content}の進捗を更新
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
          </Grid>
        </Form>
      </Stack>
    </Card>
  );
}
