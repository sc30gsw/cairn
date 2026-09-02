import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import type { ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import {
  EXAM_RESULT_CORRECT_LABEL,
  examResultActionName,
} from "~/features/goals/components/exam-goal-card";
import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { goalScopeLabel } from "~/features/goals/lib/goal-scope";
import type { ExamGoal, Goal, MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";
import type { ItemDto } from "~/types/item";

export const ACHIEVED_SECTION_TITLE = "達成した目標";
export const REFLECTION_PREFIX = "振り返り: ";
export const FINISHED_EXAM_BADGE = "本番";

const ROW_BORDER = "1px dashed var(--cairn-desk)";

type FinishedExamRowProps = {
  goal: ExamGoal;
  isLast: boolean;
  onEdit: () => void;
  onRecordResult: () => void;
  onRemove: () => void;
};

function FinishedExamRow({ goal, isLast, onEdit, onRecordResult, onRemove }: FinishedExamRowProps) {
  return (
    <Group
      component="li"
      gap="sm"
      py="xs"
      style={{ borderBottom: isLast ? undefined : ROW_BORDER }}
      wrap="wrap"
    >
      <Badge color="orange" variant="light">
        {FINISHED_EXAM_BADGE}
      </Badge>
      <Box flex="1" miw={200}>
        <Text>{goal.content}</Text>
        <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
          本番日 {goal.examDate}・目標 {goal.minScore}〜{goal.maxScore}
        </Text>
      </Box>
      {goal.result !== undefined && (
        <Text ff={NUMERAL_FONT} fw={700}>
          {goal.result.score}点
        </Text>
      )}
      {goal.result !== undefined && (
        <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
          結果 {goal.result.recordedAt}
        </Text>
      )}
      <Button
        aria-label={examResultActionName(goal)}
        onClick={onRecordResult}
        size="compact-xs"
        type="button"
        variant="subtle"
      >
        {EXAM_RESULT_CORRECT_LABEL}
      </Button>
      <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
    </Group>
  );
}

type AchievedRowProps = {
  goal: MasteryGoal;
  isLast: boolean;
  items: ItemDto[];
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  parentName: string | undefined;
  todayJst: DateJst;
};

function AchievedRow({
  goal,
  isLast,
  items,
  onEdit,
  onRemove,
  onSetAchieved,
  parentName,
  todayJst,
}: AchievedRowProps) {
  const scope = goalScopeLabel(goal.scopeItemIds, items);

  return (
    <Group
      component="li"
      gap="sm"
      py="xs"
      style={{ borderBottom: isLast ? undefined : ROW_BORDER }}
      wrap="wrap"
    >
      <Checkbox
        aria-label={`${goal.content}の達成`}
        checked={goal.achievedAt !== undefined}
        onChange={(event) =>
          onSetAchieved({
            achievedAt: event.currentTarget.checked ? todayJst : undefined,
            goalId: goal._id,
          })
        }
      />
      <Box flex="1" miw={200}>
        <Text>{goal.content}</Text>
        <Text c="dimmed" size="sm">
          基準: {goal.criterion}
        </Text>
        {goal.reflection !== undefined && (
          <Text fs="italic" size="sm">
            {REFLECTION_PREFIX}
            {goal.reflection}
          </Text>
        )}
        {parentName !== undefined && (
          <Text c="dimmed" size="xs">
            親: {parentName}
          </Text>
        )}
      </Box>
      <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
        達成 {goal.achievedAt}
      </Text>
      <Tooltip disabled={scope.itemCount === 0} label={scope.full} withArrow>
        <Text c="dimmed" data-shimmer-no-children ff={NUMERAL_FONT} size="xs">
          {scope.itemCount === 0 ? "" : `${scope.short}・`}確定 {goal.confirmedMinutes}分 /{" "}
          {goal.activeDays}日
        </Text>
      </Tooltip>
      <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
    </Group>
  );
}

type AchievedHistorySectionProps = {
  achieved: MasteryGoal[];
  finishedExams: ExamGoal[];
  form: ReactNode;
  items: ItemDto[];
  onEditGoal: (goal: Goal) => void;
  onRecordResult: (goal: ExamGoal) => void;
  onRemoveGoal: (goal: Goal) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  parentNameOf: (goal: MasteryGoal) => string | undefined;
  todayJst: DateJst;
};

export function AchievedHistorySection({
  achieved,
  finishedExams,
  form,
  items,
  onEditGoal,
  onRecordResult,
  onRemoveGoal,
  onSetAchieved,
  parentNameOf,
  todayJst,
}: AchievedHistorySectionProps) {
  const rowCount = achieved.length + finishedExams.length;

  return (
    <Card>
      <Accordion variant="contained">
        <Accordion.Item value="achieved">
          <Accordion.Control>
            {ACHIEVED_SECTION_TITLE}（
            <Text ff={NUMERAL_FONT} span>
              {rowCount}
            </Text>
            件）
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {form}
              <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
                {finishedExams.map((goal, index) => (
                  <FinishedExamRow
                    goal={goal}
                    isLast={achieved.length === 0 && index === finishedExams.length - 1}
                    key={goal._id}
                    onEdit={() => onEditGoal(goal)}
                    onRecordResult={() => onRecordResult(goal)}
                    onRemove={() => onRemoveGoal(goal)}
                  />
                ))}
                {achieved.map((goal, index) => (
                  <AchievedRow
                    goal={goal}
                    isLast={index === achieved.length - 1}
                    items={items}
                    key={goal._id}
                    onEdit={() => onEditGoal(goal)}
                    onRemove={() => onRemoveGoal(goal)}
                    onSetAchieved={onSetAchieved}
                    parentName={parentNameOf(goal)}
                    todayJst={todayJst}
                  />
                ))}
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}
