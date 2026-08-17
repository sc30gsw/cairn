import { Card, Select, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import type { GoalType } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import {
  ExamGoalFields,
  MasteryGoalFields,
  OtherGoalFields,
  PaceGoalFields,
  VolumeGoalFields,
} from "~/features/goals/components/goal-form-fields";
import { isGoalType } from "~/features/goals/lib/goal-guards";
import {
  GOAL_TYPE_DESCRIPTIONS,
  GOAL_TYPE_SELECT_DATA,
} from "~/features/goals/lib/goal-type-labels";
import type { GoalFormOutput } from "~/features/goals/schemas/goal-schema";
import type { Goal } from "~/features/goals/types/goal";
import { onRequiredSelect } from "~/lib/select";

type GoalFormProps = {
  //? 編集対象。undefined なら新規作成
  goal: Goal | undefined;
  initialType: GoalType;
  onCancel: () => void;
  onSubmit: (goal: GoalFormOutput) => void;
  todayJst: DateJst;
};

//? タイプごとに入力欄が総取り替えになるので、タイプ選択はフォームの外に置き、
//? 選ばれたタイプの専用フォーム(1タイプ1スキーマ)をマウントする。
export function GoalForm({ goal, initialType, onCancel, onSubmit, todayJst }: GoalFormProps) {
  const [selectedType, setSelectedType] = useState<GoalType>(goal?.type ?? initialType);
  const type = goal?.type ?? selectedType;
  const fieldsProps = { onCancel, onSubmit, todayJst };

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
        {type === "exam" && (
          <ExamGoalFields {...fieldsProps} goal={goal?.type === "exam" ? goal : undefined} />
        )}
        {type === "pace" && (
          <PaceGoalFields {...fieldsProps} goal={goal?.type === "pace" ? goal : undefined} />
        )}
        {type === "volume" && (
          <VolumeGoalFields {...fieldsProps} goal={goal?.type === "volume" ? goal : undefined} />
        )}
        {type === "mastery" && (
          <MasteryGoalFields {...fieldsProps} goal={goal?.type === "mastery" ? goal : undefined} />
        )}
        {type === "other" && (
          <OtherGoalFields {...fieldsProps} goal={goal?.type === "other" ? goal : undefined} />
        )}
      </Stack>
    </Card>
  );
}
