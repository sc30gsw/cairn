import { Card, Select, Stack, Text, Title } from "@mantine/core";
import { useState, type ReactElement } from "react";
import type { GoalType } from "~domain/domain";

import {
  ExamGoalFields,
  MasteryGoalFields,
  type GoalFieldsProps,
} from "~/features/goals/components/goal-form-fields";
import { GOAL_FORM_COPY, type GoalFormVariant } from "~/features/goals/lib/goal-form-copy";
import { isGoalType } from "~/features/goals/lib/goal-guards";
import {
  GOAL_TYPE_DESCRIPTIONS,
  GOAL_TYPE_SELECT_DATA,
} from "~/features/goals/lib/goal-type-labels";
import { onRequiredSelect } from "~/lib/select";

//? copy は variant から引くので受け取らない。チェックポイントとして開くとタイプは習得に固定される
type GoalFormProps = Omit<GoalFieldsProps, "copy"> &
  Record<"initialType", GoalType> &
  Partial<Record<"variant", GoalFormVariant>>;

//? 値の SSoT は ~domain/domain。ここが持つのは「タイプ→入力欄」の対応だけ
const GOAL_TYPE_FIELDS = {
  exam: ExamGoalFields,
  mastery: MasteryGoalFields,
} as const satisfies Record<GoalType, (props: GoalFieldsProps) => ReactElement>;

//? タイプごとに入力欄が総取り替えになるので、タイプ選択はフォームの外に置き、
//? 選ばれたタイプの専用フォーム(1タイプ1スキーマ)をマウントする。
export function GoalForm({
  activeCheckpointCount,
  goal,
  initialType,
  onCancel,
  onSubmit,
  todayJst,
  variant = "goal",
}: GoalFormProps) {
  const [selectedType, setSelectedType] = useState<GoalType>(goal?.type ?? initialType);
  const type = goal?.type ?? selectedType;
  const GoalTypeFields = GOAL_TYPE_FIELDS[type];
  const copy = GOAL_FORM_COPY[variant];
  //? チェックポイントは習得と決まっている。目標として開くときだけタイプを選ばせる
  const typeSelectable = variant === "goal";

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>{goal === undefined ? copy.createTitle : copy.editTitle}</Title>
        {/*? 編集では選択欄を残したまま無効化する。変えられないことを見せるため */}
        {typeSelectable && (
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
        )}
        {typeSelectable && goal !== undefined && (
          <Text c="dimmed" size="xs">
            目標タイプは変更できません。別のタイプにするときは、削除して作り直します。
          </Text>
        )}
        <GoalTypeFields
          activeCheckpointCount={activeCheckpointCount}
          copy={copy}
          goal={goal}
          onCancel={onCancel}
          onSubmit={onSubmit}
          todayJst={todayJst}
        />
      </Stack>
    </Card>
  );
}
