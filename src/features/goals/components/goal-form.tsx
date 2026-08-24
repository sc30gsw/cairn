import { Card, Stack, Title } from "@mantine/core";
import type { ReactElement } from "react";

import {
  CheckpointGoalFields,
  ExamGoalFields,
  LongTermGoalFields,
  MasteryEditFields,
  type GoalFieldsProps,
} from "~/features/goals/components/goal-form-fields";
import { GOAL_FORM_COPY, type GoalFormVariant } from "~/features/goals/lib/goal-form-copy";

//? copy は variant から引くので受け取らない。どの導線から開いたかが型と区分を決める
type GoalFormProps = Omit<GoalFieldsProps, "copy"> & Record<"variant", GoalFormVariant>;

//? 区分ごとに入力欄が総取り替えになる(1フォーム1スキーマ)。目標タイプの Select は撤去した
function goalFields(props: GoalFieldsProps, variant: GoalFormVariant): ReactElement {
  if (variant === "exam") {
    return <ExamGoalFields {...props} />;
  }
  if (props.goal !== undefined) {
    //? 編集は長期目標もチェックポイントも同じフォーム。期限の付け外しが区分の移行になる
    return <MasteryEditFields {...props} />;
  }

  return variant === "checkpoint" ? (
    <CheckpointGoalFields {...props} />
  ) : (
    <LongTermGoalFields {...props} />
  );
}

export function GoalForm({ variant, ...fieldsProps }: GoalFormProps) {
  const copy = GOAL_FORM_COPY[variant];
  const props = { ...fieldsProps, copy };

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>{props.goal === undefined ? copy.createTitle : copy.editTitle}</Title>
        {goalFields(props, variant)}
      </Stack>
    </Card>
  );
}
