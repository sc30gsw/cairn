import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { ExamGoal } from "~/features/goals/types/goal";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";

export const EXAM_GOAL_INCOMPLETE_TITLE = "未完成 — 週間ターゲットを設定してください";
export const EXAM_GOAL_SECTION_TITLE = "本番目標";
export const EXAM_GOAL_FINISHED_BADGE = "終了";
export const EXAM_RESULT_ACTION_LABEL = "結果を入れる";
export const EXAM_RESULT_CORRECT_LABEL = "結果を訂正";
export const EXAM_RESULT_LABEL = "結果";

export function examResultActionName(goal: Pick<ExamGoal, "content" | "result">): string {
  return `${goal.content}の${goal.result === undefined ? EXAM_RESULT_ACTION_LABEL : EXAM_RESULT_CORRECT_LABEL}`;
}

type ExamGoalBodyProps = {
  goal: ExamGoal;
  hasWeeklyTargets: boolean;
  onEdit: () => void;
  onRecordResult: () => void;
  onRemove: () => void;
  onShowWeeklyTargets: () => void;
  todayJst: DateJst;
};

export function ExamGoalBody({
  goal,
  hasWeeklyTargets,
  onEdit,
  onRecordResult,
  onRemove,
  onShowWeeklyTargets,
  todayJst,
}: ExamGoalBodyProps) {
  const remainingDays = daysUntil(todayJst, goal.examDate);
  const { result } = goal;
  const active = result === undefined;

  return (
    <Stack gap="md">
      <Group gap="xs" justify="space-between" wrap="wrap">
        <Group gap="xs" wrap="wrap">
          <Title order={2}>{EXAM_GOAL_SECTION_TITLE}</Title>
          {!active && (
            <Badge color="green" variant="light">
              {EXAM_GOAL_FINISHED_BADGE}
            </Badge>
          )}
        </Group>
        <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
      </Group>
      <Text>{goal.content}</Text>
      {result !== undefined ? (
        //? 終了した本番はカウントダウンを出さず、結果を大きく置く
        <Group align="baseline" gap="xs" wrap="wrap">
          <Title ff={NUMERAL_FONT} fw={700} order={2}>
            {result.score}
            <Text c="dimmed" ff={BODY_FONT} fz="md" span>
              点
            </Text>
          </Title>
          <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
            {EXAM_RESULT_LABEL} {result.recordedAt}
          </Text>
        </Group>
      ) : remainingDays >= 0 ? (
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
        {active && remainingDays >= 0 ? ` まであと ${remainingDays} 日` : ""}。
        {GOAL_TYPE_LABELS.exam}の目標 {goal.minScore}〜{goal.maxScore}。
      </Text>
      {active && remainingDays <= 0 && (
        <Group>
          <Button
            aria-label={examResultActionName(goal)}
            color="green"
            onClick={onRecordResult}
            size="xs"
            type="button"
          >
            {EXAM_RESULT_ACTION_LABEL}
          </Button>
        </Group>
      )}
      {!active && (
        <Group>
          <Button
            aria-label={examResultActionName(goal)}
            onClick={onRecordResult}
            size="xs"
            type="button"
            variant="subtle"
          >
            {EXAM_RESULT_CORRECT_LABEL}
          </Button>
        </Group>
      )}
      {active && !hasWeeklyTargets && (
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
