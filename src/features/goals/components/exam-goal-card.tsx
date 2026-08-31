import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { ExamGoal } from "~/features/goals/types/goal";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";

export const EXAM_GOAL_INCOMPLETE_TITLE = "未完成 — 週間ターゲットを設定してください";
export const EXAM_GOAL_SECTION_TITLE = "本番目標";

type ExamGoalBodyProps = {
  goal: ExamGoal;
  hasWeeklyTargets: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onShowWeeklyTargets: () => void;
  todayJst: DateJst;
};

export function ExamGoalBody({
  goal,
  hasWeeklyTargets,
  onEdit,
  onRemove,
  onShowWeeklyTargets,
  todayJst,
}: ExamGoalBodyProps) {
  const remainingDays = daysUntil(todayJst, goal.examDate);

  return (
    <Stack gap="md">
      <Group gap="xs" justify="space-between" wrap="wrap">
        <Title order={2}>{EXAM_GOAL_SECTION_TITLE}</Title>
        <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
      </Group>
      <Text>{goal.content}</Text>
      {remainingDays >= 0 ? (
        <Title ff={NUMERAL_FONT} fw={700} order={2}>
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
        {remainingDays >= 0 ? ` まであと ${remainingDays} 日` : ""}。{GOAL_TYPE_LABELS.exam}の目標{" "}
        {goal.minScore}〜{goal.maxScore}。
      </Text>
      {!hasWeeklyTargets && (
        <Alert color="yellow" title={EXAM_GOAL_INCOMPLETE_TITLE} variant="light">
          <Stack align="flex-start" gap="xs">
            <Text size="sm">
              本番目標だけでは日々の行動が決まりません。カテゴリーごとに「何をどれくらい」を置きましょう。
            </Text>
            <Button color="yellow" onClick={onShowWeeklyTargets} size="xs" type="button">
              週間ターゲットを設定する
            </Button>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
