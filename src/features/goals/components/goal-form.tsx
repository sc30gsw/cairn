import { Card, Select, Stack, Text, Title } from "@mantine/core";
import { useState, type ReactElement } from "react";
import type { GoalType } from "~domain/domain";

import {
  ExamGoalFields,
  MasteryGoalFields,
  OtherGoalFields,
  PaceGoalFields,
  VolumeGoalFields,
  type GoalFieldsProps,
} from "~/features/goals/components/goal-form-fields";
import { isGoalType } from "~/features/goals/lib/goal-guards";
import {
  GOAL_TYPE_DESCRIPTIONS,
  GOAL_TYPE_SELECT_DATA,
} from "~/features/goals/lib/goal-type-labels";
import { onRequiredSelect } from "~/lib/select";

type GoalFormProps = GoalFieldsProps & Record<"initialType", GoalType>;

//? 値の SSoT は ~domain/domain。ここが持つのは「タイプ→入力欄」の対応だけ
const GOAL_TYPE_FIELDS = {
  exam: ExamGoalFields,
  mastery: MasteryGoalFields,
  other: OtherGoalFields,
  pace: PaceGoalFields,
  volume: VolumeGoalFields,
} as const satisfies Record<GoalType, (props: GoalFieldsProps) => ReactElement>;

//? タイプごとに入力欄が総取り替えになるので、タイプ選択はフォームの外に置き、
//? 選ばれたタイプの専用フォーム(1タイプ1スキーマ)をマウントする。
export function GoalForm({ goal, initialType, onCancel, onSubmit, todayJst }: GoalFormProps) {
  const [selectedType, setSelectedType] = useState<GoalType>(goal?.type ?? initialType);
  const type = goal?.type ?? selectedType;
  const GoalTypeFields = GOAL_TYPE_FIELDS[type];

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>{goal === undefined ? "目標を追加" : "目標を編集"}</Title>
        <Select
          allowDeselect={false}
          data={GOAL_TYPE_SELECT_DATA}
          description={GOAL_TYPE_DESCRIPTIONS[type]}
          //? タイプは目標の骨格。あとから変えない(CONTEXT.md 目標タイプ)
          disabled={goal !== undefined}
          label="目標タイプ"
          onChange={onRequiredSelect((value) => {
            if (isGoalType(value)) {
              setSelectedType(value);
            }
          })}
          value={type}
        />
        {goal !== undefined && (
          <Text c="dimmed" size="xs">
            目標タイプは変更できません。別のタイプにするときは、削除して作り直します。
          </Text>
        )}
        <GoalTypeFields goal={goal} onCancel={onCancel} onSubmit={onSubmit} todayJst={todayJst} />
      </Stack>
    </Card>
  );
}
