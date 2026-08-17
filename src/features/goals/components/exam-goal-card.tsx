import { Alert, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { ExamGoal } from "~/features/goals/types/goal";
import { BODY_FONT, DISPLAY_FONT } from "~/lib/theme";

type ExamGoalCardProps = {
  goal: ExamGoal;
  hasPaceGoal: boolean;
  onAddPace: () => void;
  onEdit: () => void;
  onRemove: () => void;
  todayJst: DateJst;
};

//? カウントダウンはクライアント計算。クエリで Date.now() を読まない(CVX-14)
export function ExamGoalCard({
  goal,
  hasPaceGoal,
  onAddPace,
  onEdit,
  onRemove,
  todayJst,
}: ExamGoalCardProps) {
  const remainingDays = daysUntil(todayJst, goal.examDate);

  return (
    <Card h="100%">
      <Stack gap="md">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Title order={2}>{GOAL_TYPE_LABELS.exam}</Title>
          <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
        </Group>
        <Text>{goal.content}</Text>
        {remainingDays >= 0 ? (
          <Title ff={DISPLAY_FONT} fw={500} order={2}>
            {remainingDays}
            <Text c="dimmed" ff={BODY_FONT} fz="md" span>
              日
            </Text>
          </Title>
        ) : (
          <Text c="dimmed">本番日を過ぎています。</Text>
        )}
        <Text>
          {goal.examDate}
          {remainingDays >= 0 ? ` まであと ${remainingDays} 日` : ""}。目標 {goal.minScore}〜
          {goal.maxScore}。
        </Text>
        {!hasPaceGoal && (
          //? 本番日だけの目標は行動に落ちない。週の頻度とセットにする(docs/adr/0003)
          <Alert color="yellow" title="ペースを設定してください" variant="light">
            <Stack align="flex-start" gap="xs">
              <Text size="sm">
                本番目標だけでは日々の行動が決まりません。週に何日・1日何分やるかを決めましょう。
              </Text>
              <Button color="yellow" onClick={onAddPace} size="xs" type="button">
                ペース目標を作成する
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
