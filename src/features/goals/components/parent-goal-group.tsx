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

export const CHECKPOINT_GROUP_TITLE = "チェックポイント";
export const CHECKPOINT_GROUP_EMPTY_MESSAGE = "チェックポイントなし";

//? 子グループの破線左罫。親カードだけがスケッチ枠と紙影を持つ = 「1枚の紙に子を書き込んだ」形
const CHILD_BORDER = "1px dashed var(--cairn-desk)";

type ParentGoalGroupCommonProps = {
  //? 未達成の子だけ。期限昇順
  checkpoints: MasteryGoal[];
  //? 追加・編集フォームはヘッダ直下に開く
  form: ReactNode;
  //? undefined ならこのグループの追加導線を出さない(フォームを開いている間)
  onAddCheckpoint: (() => void) | undefined;
  onEditGoal: (goal: Goal) => void;
  onRemoveGoal: (goal: Goal) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

//? 本番目標のときだけ週間ターゲットの未完成アラートを持つ。長期目標には無い概念なので型で分ける
type ParentGoalGroupProps = ParentGoalGroupCommonProps &
  (
    | { hasWeeklyTargets: boolean; kind: "exam"; onShowWeeklyTargets: () => void; parent: ExamGoal }
    | { kind: "longTerm"; parent: MasteryGoal }
  );

export function ParentGoalGroup(props: ParentGoalGroupProps) {
  const {
    checkpoints,
    form,
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
