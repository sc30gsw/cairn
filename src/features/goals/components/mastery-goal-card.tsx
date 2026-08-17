import { Badge, Card, Checkbox, Group, Stack, Text, Title } from "@mantine/core";
import { compareDateJst, daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";

const CHECKPOINT_LABEL = "チェックポイント";
export const OVERDUE_LABEL = "期限超過";

type MasteryGoalCardProps = {
  goal: MasteryGoal;
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

//? 期限を持つ習得の呼び名がチェックポイント。データ上は同じタイプ(docs/adr/0006)
export function MasteryGoalCard({
  goal,
  onEdit,
  onRemove,
  onSetAchieved,
  todayJst,
}: MasteryGoalCardProps) {
  const achieved = goal.achievedAt !== undefined;
  //? 期限切れは表示が変わるだけ。未達の自動失敗記録は残さない(CONTEXT.md「習得」)
  const overdue =
    !achieved && goal.deadline !== undefined && compareDateJst(goal.deadline, todayJst) < 0;

  return (
    <Card h="100%" padding="md">
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Checkbox
              aria-label={`${goal.content}の達成`}
              checked={achieved}
              onChange={(event) =>
                onSetAchieved({
                  achievedAt: event.currentTarget.checked ? todayJst : undefined,
                  goalId: goal._id,
                })
              }
            />
            <Title order={3}>
              {goal.deadline === undefined ? GOAL_TYPE_LABELS.mastery : CHECKPOINT_LABEL}
            </Title>
            {overdue && (
              <Badge color="red" variant="light">
                {OVERDUE_LABEL}
              </Badge>
            )}
          </Group>
          <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
        </Group>
        <Text>{goal.content}</Text>
        <Text size="sm">基準: {goal.criterion}</Text>
        <MasteryDeadlineText deadline={goal.deadline} todayJst={todayJst} />
        {goal.achievedAt !== undefined && (
          <Text c="dimmed" size="sm">
            達成 {goal.achievedAt}
          </Text>
        )}
        {/*? 自己判定の較正のために学習量の実績を併記する(Kruger & Dunning 1999) */}
        <Text c="dimmed" size="xs">
          確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
        </Text>
      </Stack>
    </Card>
  );
}

type MasteryDeadlineTextProps = {
  deadline: MasteryGoal["deadline"];
  todayJst: DateJst;
};

function MasteryDeadlineText({ deadline, todayJst }: MasteryDeadlineTextProps) {
  if (deadline === undefined) {
    return (
      <Text c="dimmed" size="sm">
        期限なし
      </Text>
    );
  }

  const remainingDays = daysUntil(todayJst, deadline);

  return (
    <Text c="dimmed" size="sm">
      期限 {deadline}
      {remainingDays >= 0 ? `（あと ${remainingDays} 日）` : ""}
    </Text>
  );
}
