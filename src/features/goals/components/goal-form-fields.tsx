import { Field, Form, useForm, type FieldStore } from "@formisch/react";
import { Alert, Button, Grid, Group, NumberInput, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { TOEIC_SCORE } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { nextSundayJst } from "~/features/goals/lib/checkpoint-deadline";
import {
  ExamGoalFieldsSchema,
  MasteryGoalFieldsSchema,
  type GoalFormOutput,
} from "~/features/goals/schemas/goal-schema";
import type { Goal } from "~/features/goals/types/goal";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";

const CONTENT_LABEL = "目標の内容";
const CONTENT_PLACEHOLDER = "例: 金のフレーズを1 Unit 音読する";

//* 同時に追いかけるチェックポイントの目安。超えても止めない非ブロッキングの助言(docs/adr/0006)。
const CHECKPOINT_CROWDED_THRESHOLD = 2;
export const CHECKPOINT_CROWDED_MESSAGE = "同時に追いかけるチェックポイントは1〜2件が目安です";

//? タイプごとにフォームは総取り替えだが、props は共通。GoalForm 側でタイプ→部品を引けるようにする
export type GoalFieldsProps = {
  //? 期限つき・未達成の習得の件数。3件目を作るときだけ助言を出す
  activeCheckpointCount: number;
  //? 編集対象。undefined なら新規作成
  goal: Goal | undefined;
  onCancel: () => void;
  onSubmit: (goal: GoalFormOutput) => void;
  todayJst: DateJst;
};

type GoalFieldsSchema = typeof ExamGoalFieldsSchema | typeof MasteryGoalFieldsSchema;

//? どちらのタイプも文字列フィールドの FieldStore は同じ形。path だけ違うので落として使い回す
type GoalTextFieldStore = Omit<FieldStore<GoalFieldsSchema, ["content"]>, "path">;

type GoalDateFieldProps = {
  clearable?: boolean;
  field: GoalTextFieldStore;
  label: string;
  todayJst: DateJst;
};

function GoalContentField({ field }: Record<"field", GoalTextFieldStore>) {
  return (
    <ConcreteActionField
      {...field.props}
      error={field.errors?.[0]}
      label={CONTENT_LABEL}
      placeholder={CONTENT_PLACEHOLDER}
      value={field.input}
    />
  );
}

function GoalDateField({ clearable = false, field, label, todayJst }: GoalDateFieldProps) {
  return (
    <DatePickerInput
      classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
      clearable={clearable}
      error={field.errors?.[0]}
      firstDayOfWeek={1}
      getDayProps={(date) => calendarDayProps(date, todayJst)}
      label={label}
      locale="ja"
      name={field.props.name}
      onChange={(value) => field.onChange(value ?? "")}
      popoverProps={{ withinPortal: true }}
      value={field.input ?? ""}
      valueFormat="YYYY-MM-DD"
    />
  );
}

function GoalFormActions({ onCancel }: Record<"onCancel", () => void>) {
  return (
    <Group gap="sm">
      <Button type="submit">保存</Button>
      <Button onClick={onCancel} type="button" variant="subtle">
        キャンセル
      </Button>
    </Group>
  );
}

export function ExamGoalFields({ goal, onCancel, onSubmit, todayJst }: GoalFieldsProps) {
  const examGoal = goal?.type === "exam" ? goal : undefined;
  const form = useForm({
    initialInput: {
      content: examGoal?.content ?? "",
      examDate: examGoal?.examDate ?? "",
      maxScore: examGoal?.maxScore,
      minScore: examGoal?.minScore,
    },
    schema: ExamGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "exam" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => <GoalContentField field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["examDate"]}>
            {(field) => <GoalDateField field={field} label="本番日" todayJst={todayJst} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={6}>
          <Field of={form} path={["minScore"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="目標スコア下限"
                max={TOEIC_SCORE.max}
                min={TOEIC_SCORE.min}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                step={TOEIC_SCORE.step}
                value={field.input ?? ""}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={6}>
          <Field of={form} path={["maxScore"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="目標スコア上限"
                max={TOEIC_SCORE.max}
                min={TOEIC_SCORE.min}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                step={TOEIC_SCORE.step}
                value={field.input ?? ""}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalFormActions onCancel={onCancel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}

export function MasteryGoalFields({
  activeCheckpointCount,
  goal,
  onCancel,
  onSubmit,
  todayJst,
}: GoalFieldsProps) {
  const masteryGoal = goal?.type === "mastery" ? goal : undefined;
  //? 期限の既定は次の日曜。週の切れ目に置くだけのナッジで、消せるし変えられる
  const form = useForm({
    initialInput: {
      content: masteryGoal?.content ?? "",
      criterion: masteryGoal?.criterion ?? "",
      deadline: masteryGoal?.deadline ?? (goal === undefined ? nextSundayJst(todayJst) : ""),
    },
    schema: MasteryGoalFieldsSchema,
  });
  const crowded = goal === undefined && activeCheckpointCount >= CHECKPOINT_CROWDED_THRESHOLD;

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "mastery" })}>
      <Grid align="flex-start" gap="sm">
        {crowded && (
          <Grid.Col span={12}>
            {/*? 止めない。列やチェーンにせず件数を絞るための助言だけ(Rai et al. 2023) */}
            <Alert color="yellow" title={CHECKPOINT_CROWDED_MESSAGE} variant="light">
              いま追いかけているチェックポイントが {activeCheckpointCount}{" "}
              件あります。先に片づけてからでも遅くありません。
            </Alert>
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => <GoalContentField field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["criterion"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="達成の基準"
                placeholder="例: Unit 1-10 を止まらずに音読できる"
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["deadline"]}>
            {(field) => (
              <GoalDateField clearable field={field} label="期限（任意）" todayJst={todayJst} />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalFormActions onCancel={onCancel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}
