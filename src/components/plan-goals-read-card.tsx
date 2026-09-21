import { Anchor, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import {
  PLAN_GOALS_EDIT_HREF,
  PLAN_GOALS_EDIT_LABEL,
  PLAN_GOALS_EMPTY_MESSAGE,
  type PlanGoalRead,
} from "~/lib/plan-goal-read";

type PlanGoalsReadCardProps = {
  goals: readonly PlanGoalRead[];
};

export function PlanGoalsReadCard({ goals }: PlanGoalsReadCardProps) {
  return (
    <Card>
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={2}>目標</Title>
          <Anchor component={Link} size="sm" to={PLAN_GOALS_EDIT_HREF}>
            {PLAN_GOALS_EDIT_LABEL}
          </Anchor>
        </Group>
        {goals.length === 0 ? (
          <Text c="dimmed" size="sm">
            {PLAN_GOALS_EMPTY_MESSAGE}
          </Text>
        ) : (
          <Stack gap="md">
            {goals.map((goal) => (
              <GoalReadFields key={goal._id} goal={goal} />
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function GoalReadFields({ goal }: Record<"goal", PlanGoalRead>) {
  return (
    <Stack gap="xs">
      <ReadField label="内容" value={goal.content} />
      {goal.type === "exam" && goal.examDate !== undefined ? (
        <ReadField label="本番日" value={goal.examDate} />
      ) : null}
      {goal.type === "mastery" && goal.deadline !== undefined ? (
        <ReadField label="期限" value={goal.deadline} />
      ) : null}
    </Stack>
  );
}

function ReadField({ label, value }: Record<"label" | "value", string>) {
  return (
    <Stack gap={2}>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}
