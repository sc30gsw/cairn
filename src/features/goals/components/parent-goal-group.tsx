import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { CheckpointRow } from "~/features/goals/components/checkpoint-row";
import { ExamGoalBody } from "~/features/goals/components/exam-goal-card";
import { MasteryGoalBody } from "~/features/goals/components/mastery-goal-card";
import type { ExamGoal, Goal, MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";
import type { ItemDto } from "~/types/item";

export const CHECKPOINT_GROUP_TITLE = "チェックポイント";
export const CHECKPOINT_GROUP_EMPTY_MESSAGE = "チェックポイントなし";

const CHILD_BORDER = "1px dashed var(--cairn-desk)";

type ParentGoalGroupCommonProps = {
  checkpoints: MasteryGoal[];
  form: ReactNode;
  items: ItemDto[];
  onAddCheckpoint: (() => void) | undefined;
  onEditGoal: (goal: Goal) => void;
  onRemoveGoal: (goal: Goal) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

type ParentGoalGroupProps = ParentGoalGroupCommonProps &
  (
    | { hasWeeklyTargets: boolean; kind: "exam"; onShowWeeklyTargets: () => void; parent: ExamGoal }
    | { kind: "longTerm"; parent: MasteryGoal }
  );

export function ParentGoalGroup(props: ParentGoalGroupProps) {
  const {
    checkpoints,
    form,
    items,
    onAddCheckpoint,
    onEditGoal,
    onRemoveGoal,
    onSetAchieved,
    parent,
    todayJst,
  } = props;

  return (
    <Card h="100%">
      <Stack gap="md">
        {props.kind === "exam" ? (
          <ExamGoalBody
            goal={props.parent}
            hasWeeklyTargets={props.hasWeeklyTargets}
            onEdit={() => onEditGoal(props.parent)}
            onRemove={() => onRemoveGoal(props.parent)}
            onShowWeeklyTargets={props.onShowWeeklyTargets}
            todayJst={todayJst}
          />
        ) : (
          <MasteryGoalBody
            goal={props.parent}
            items={items}
            onEdit={() => onEditGoal(props.parent)}
            onRemove={() => onRemoveGoal(props.parent)}
            onSetAchieved={onSetAchieved}
            todayJst={todayJst}
          />
        )}
        <Stack
          aria-label={`${parent.content}のチェックポイント`}
          component="section"
          gap="xs"
          pl="md"
          style={{ borderLeft: CHILD_BORDER }}
        >
          <Group gap="sm" justify="space-between" wrap="wrap">
            <Title order={3}>
              {CHECKPOINT_GROUP_TITLE}{" "}
              <Text ff={NUMERAL_FONT} span>
                ({checkpoints.length})
              </Text>
            </Title>
            {onAddCheckpoint !== undefined && (
              <Button
                aria-label={`${parent.content}にチェックポイントを追加`}
                leftSection={<IconPlus aria-hidden size={14} />}
                onClick={onAddCheckpoint}
                size="xs"
                type="button"
                variant="default"
              >
                追加
              </Button>
            )}
          </Group>
          {form}
          {checkpoints.length === 0 ? (
            <Text c="dimmed" size="sm">
              {CHECKPOINT_GROUP_EMPTY_MESSAGE}
            </Text>
          ) : (
            <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
              {checkpoints.map((goal, index) => (
                <CheckpointRow
                  goal={goal}
                  isLast={index === checkpoints.length - 1}
                  items={items}
                  key={goal._id}
                  onEdit={() => onEditGoal(goal)}
                  onRemove={() => onRemoveGoal(goal)}
                  onSetAchieved={onSetAchieved}
                  todayJst={todayJst}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
