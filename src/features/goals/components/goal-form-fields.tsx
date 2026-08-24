import { Field, Form, setErrors, useField, useForm, type FieldStore } from "@formisch/react";
import {
  Alert,
  Button,
  Grid,
  Group,
  Input,
  MultiSelect,
  NumberInput,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useState } from "react";
import {
  CHECKPOINT_HAS_CHILDREN_MESSAGE,
  GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE,
  TOEIC_SCORE,
} from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { nextSundayJst } from "~/features/goals/lib/checkpoint-deadline";
import {
  GOAL_SCOPE_FROZEN_HINT,
  GOAL_SCOPE_HINT,
  type GoalFormCopy,
} from "~/features/goals/lib/goal-form-copy";
import {
  ALL_RECORDS_LABEL,
  goalScopeOptions,
  resolveScopeItemIds,
} from "~/features/goals/lib/goal-scope";
import { tierTransition, tierTransitionAlert } from "~/features/goals/lib/goal-tier-transition";
import { parentGoalOptions, type ParentGoal } from "~/features/goals/lib/goal-tree";
import { GOAL_TYPE_DESCRIPTIONS } from "~/features/goals/lib/goal-type-labels";
import {
  CheckpointGoalFieldsSchema,
  ExamGoalFieldsSchema,
  LongTermGoalFieldsSchema,
  MasteryEditFieldsSchema,
} from "~/features/goals/schemas/goal-schema";
import type { ExamGoal, Goal, MasteryGoal } from "~/features/goals/types/goal";
import type { GoalInputPayload } from "~/features/goals/types/mutations";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";
import type { CategoryDto } from "~/types/category";
import type { ItemDto, ItemId } from "~/types/item";

const CONTENT_PLACEHOLDER = "例: 金のフレーズを1 Unit 音読する";
const CRITERION_PLACEHOLDER = "例: Unit 1-10 を止まらずに音読できる";
const PARENT_LABEL = "親";
const DEADLINE_LABEL = "期限";
const OPTIONAL_DEADLINE_LABEL = "期限（任意）";

//* 同時に追いかけるチェックポイントの目安。超えても止めない非ブロッキングの助言(docs/adr/0006)。
const CHECKPOINT_CROWDED_THRESHOLD = 2;
export const CHECKPOINT_CROWDED_MESSAGE = "同時に追いかけるチェックポイントは1〜2件が目安です";
const PARENT_NOT_FOUND_MESSAGE = "親の目標が見つかりません。選び直してください";

//? どのフォームも props は共通。GoalForm が variant から部品を引けるようにする
export type GoalFieldsProps = {
  //? その親の未達成チェックポイント数。3件目を作るときだけ助言を出す(親ごとに数える)
  activeCheckpointCount: number;
  //? 対象項目の MultiSelect の見出し
  categories: CategoryDto[];
  //? フォームの語。GoalForm が variant から引いて渡す
  copy: GoalFormCopy;
  //? 編集対象。undefined なら新規作成
  goal: Goal | undefined;
  //? 親候補の引き当て(Select が返す文字列から Id のブランドを取り戻す)
  goals: Goal[];
  //? 子チェックポイントを持つ長期目標は期限を付けられない(INV-5)
  hasChildCheckpoints: boolean;
  //? 対象項目の選択肢と引き当て(MultiSelect が返す文字列から Id のブランドを取り戻す)
  items: ItemDto[];
  onCancel: () => void;
  onSubmit: (goal: GoalInputPayload) => void;
  //? 新規チェックポイントの親。導線から確定するので Select は出さない
  parent: ParentGoal | undefined;
  todayJst: DateJst;
};

const SCOPE_LABEL = "実績に数える項目";

type GoalScopeFieldProps = {
  categories: CategoryDto[];
  //? 達成済みは実績が凍結されている。対象を変えると凍結値の意味が壊れる(#53 §7.2)
  disabled: boolean;
  error: string | undefined;
  items: ItemDto[];
  onChange: (values: string[]) => void;
  values: string[];
};

//? 対象項目は Formisch のストアに載せない。MultiSelect の値は1入力の配列で、
//? クロスフィールド検証も無いので TargetForm の categoryId と同じ useState 管理にする(#53 §10.1)
function GoalScopeField({
  categories,
  disabled,
  error,
  items,
  onChange,
  values,
}: GoalScopeFieldProps) {
  return (
    <MultiSelect
      clearable
      data={goalScopeOptions(items, categories)}
      description={disabled ? GOAL_SCOPE_FROZEN_HINT : GOAL_SCOPE_HINT}
      disabled={disabled}
      error={error}
      label={SCOPE_LABEL}
      onChange={onChange}
      placeholder={ALL_RECORDS_LABEL}
      searchable
      value={values}
    />
  );
}

//? 新規チェックポイントの初期値は親の対象項目(親が長期目標のときだけ)。継承は初期値のコピーで、
//? 以後は連動しない(#53 §18-16)。本番目標は対象項目を持たないので空になる。
function initialScopeValues(goal: MasteryGoal | undefined, parent: ParentGoal | undefined) {
  if (goal !== undefined) {
    return goal.scopeItemIds ?? [];
  }
  return (parent?.type === "mastery" ? parent.scopeItemIds : undefined) ?? [];
}

//* 送信時に MultiSelect の文字列を Id へ引き当てる。引けない値が混ざっていたら送らせない。
function scopePayload(
  values: readonly string[],
  items: readonly ItemDto[],
  onError: (message: string) => void,
): Record<"scopeItemIds", ItemId[] | undefined> | undefined {
  const { itemIds, unresolved } = resolveScopeItemIds(values, items);
  if (unresolved.length > 0) {
    onError(GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE);
    return undefined;
  }

  return { scopeItemIds: itemIds.length === 0 ? undefined : itemIds };
}

type GoalFieldsSchema =
  | typeof CheckpointGoalFieldsSchema
  | typeof ExamGoalFieldsSchema
  | typeof LongTermGoalFieldsSchema
  | typeof MasteryEditFieldsSchema;

//? どのスキーマでも文字列フィールドの FieldStore は同じ形。path だけ違うので落として使い回す
type GoalTextFieldStore = Omit<FieldStore<GoalFieldsSchema, ["content"]>, "path">;

type GoalDateFieldProps = {
  clearable?: boolean;
  description?: string;
  disabled?: boolean;
  field: GoalTextFieldStore;
  label: string;
  todayJst: DateJst;
};

type GoalContentFieldProps = {
  contentLabel: GoalFormCopy["contentLabel"];
  field: GoalTextFieldStore;
};

function GoalContentField({ contentLabel, field }: GoalContentFieldProps) {
  return (
    <ConcreteActionField
      {...field.props}
      error={field.errors?.[0]}
      label={contentLabel}
      placeholder={CONTENT_PLACEHOLDER}
      value={field.input}
    />
  );
}

function GoalCriterionField({ field }: Record<"field", GoalTextFieldStore>) {
  return (
    <TextInput
      {...field.props}
      error={field.errors?.[0]}
      label="達成の基準"
      placeholder={CRITERION_PLACEHOLDER}
      value={field.input}
    />
  );
}

function GoalDateField({
  clearable = false,
  description,
  disabled = false,
  field,
  label,
  todayJst,
}: GoalDateFieldProps) {
  return (
    <DatePickerInput
      classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
      clearable={clearable}
      //? クリアボタンは既定でアクセシブル名を持たない。色や位置だけに頼らない(#48 §12)
      clearButtonProps={{ "aria-label": `${label}を消す` }}
      description={description}
      disabled={disabled}
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

type GoalFormActionsProps = {
  onCancel: () => void;
  submitLabel: GoalFormCopy["submitLabel"];
};

function GoalFormActions({ onCancel, submitLabel }: GoalFormActionsProps) {
  return (
    <Group gap="sm">
      <Button type="submit">{submitLabel}</Button>
      <Button onClick={onCancel} type="button" variant="subtle">
        キャンセル
      </Button>
    </Group>
  );
}

//? 止めない。列やチェーンにせず件数を絞るための助言だけ(Rai et al. 2023)
function CheckpointCrowdedAlert({ count }: Record<"count", number>) {
  return (
    <Alert color="yellow" title={CHECKPOINT_CROWDED_MESSAGE} variant="light">
      いま追いかけているチェックポイントが {count} 件あります。先に片づけてからでも遅くありません。
    </Alert>
  );
}

export function ExamGoalFields({ copy, goal, onCancel, onSubmit, todayJst }: GoalFieldsProps) {
  const examGoal: ExamGoal | undefined = goal?.type === "exam" ? goal : undefined;
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
            {(field) => <GoalContentField contentLabel={copy.contentLabel} field={field} />}
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
          <GoalFormActions onCancel={onCancel} submitLabel={copy.submitLabel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}

//* 新規長期目標。期限欄は出さない(期限を切りたくなったら編集で付ける = そのとき親が必要になる)。
export function LongTermGoalFields({
  categories,
  copy,
  items,
  onCancel,
  onSubmit,
}: GoalFieldsProps) {
  const form = useForm({
    initialInput: { content: "", criterion: "" },
    schema: LongTermGoalFieldsSchema,
  });
  const [scopeValues, setScopeValues] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState<string>();

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        const scope = scopePayload(scopeValues, items, setScopeError);
        if (scope === undefined) {
          return;
        }
        onSubmit({
          ...output,
          ...scope,
          deadline: undefined,
          parentGoalId: undefined,
          type: "mastery",
        });
      }}
    >
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Text c="dimmed" size="sm">
            {GOAL_TYPE_DESCRIPTIONS.mastery}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => <GoalContentField contentLabel={copy.contentLabel} field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["criterion"]}>
            {(field) => <GoalCriterionField field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalScopeField
            categories={categories}
            disabled={false}
            error={scopeError}
            items={items}
            onChange={setScopeValues}
            values={scopeValues}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalFormActions onCancel={onCancel} submitLabel={copy.submitLabel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}

//* 新規チェックポイント。親は押した導線が決めるので読み取り専用、期限は必須(既定は次の日曜)。
export function CheckpointGoalFields({
  activeCheckpointCount,
  categories,
  copy,
  items,
  onCancel,
  onSubmit,
  parent,
  todayJst,
}: GoalFieldsProps) {
  const form = useForm({
    initialInput: {
      content: "",
      criterion: "",
      deadline: nextSundayJst(todayJst),
      parentGoalId: parent?._id ?? "",
    },
    schema: CheckpointGoalFieldsSchema,
  });
  const [scopeValues, setScopeValues] = useState<string[]>(() => [
    ...initialScopeValues(undefined, parent),
  ]);
  const [scopeError, setScopeError] = useState<string>();

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        if (parent === undefined) {
          setErrors(form, { errors: [PARENT_NOT_FOUND_MESSAGE], path: ["parentGoalId"] });
          return;
        }
        const scope = scopePayload(scopeValues, items, setScopeError);
        if (scope === undefined) {
          return;
        }
        onSubmit({ ...output, ...scope, parentGoalId: parent._id, type: "mastery" });
      }}
    >
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Input.Wrapper label={PARENT_LABEL}>
            <Text>{parent?.content ?? ""}</Text>
          </Input.Wrapper>
        </Grid.Col>
        {activeCheckpointCount >= CHECKPOINT_CROWDED_THRESHOLD && (
          <Grid.Col span={12}>
            <CheckpointCrowdedAlert count={activeCheckpointCount} />
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => <GoalContentField contentLabel={copy.contentLabel} field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["criterion"]}>
            {(field) => <GoalCriterionField field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["deadline"]}>
            {(field) => <GoalDateField field={field} label={DEADLINE_LABEL} todayJst={todayJst} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalScopeField
            categories={categories}
            disabled={false}
            error={scopeError}
            items={items}
            onChange={setScopeValues}
            values={scopeValues}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalFormActions onCancel={onCancel} submitLabel={copy.submitLabel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}

//* 習得の編集(長期目標 / チェックポイント共通)。期限の付け外しが区分の移行そのものになる。
export function MasteryEditFields({
  categories,
  copy,
  goal,
  goals,
  hasChildCheckpoints,
  items,
  onCancel,
  onSubmit,
  todayJst,
}: GoalFieldsProps) {
  const masteryGoal: MasteryGoal | undefined = goal?.type === "mastery" ? goal : undefined;
  const form = useForm({
    initialInput: {
      content: masteryGoal?.content ?? "",
      criterion: masteryGoal?.criterion ?? "",
      deadline: masteryGoal?.deadline ?? "",
      parentGoalId: masteryGoal?.parentGoalId ?? "",
    },
    schema: MasteryEditFieldsSchema,
  });
  const [scopeValues, setScopeValues] = useState<string[]>(() => [
    ...initialScopeValues(masteryGoal, undefined),
  ]);
  const [scopeError, setScopeError] = useState<string>();
  const scopeFrozen = masteryGoal?.achievedAt !== undefined;
  const deadlineField = useField(form, { path: ["deadline"] });
  const parentField = useField(form, { path: ["parentGoalId"] });
  const deadline = deadlineField.input ?? "";
  const parentGoalId = parentField.input ?? "";
  const transition = tierTransition({
    after: { deadline, parentGoalId },
    before: { deadline: masteryGoal?.deadline, parentGoalId: masteryGoal?.parentGoalId },
  });
  const selectedParent = goals.find((candidate) => candidate._id === parentGoalId);
  const alert = tierTransitionAlert(transition, selectedParent?.content);

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        const scope = scopePayload(scopeValues, items, setScopeError);
        if (scope === undefined) {
          return;
        }
        if (output.deadline === undefined) {
          //? 期限を外すと親も落ちる(INV-1)。replace なので同時に消える
          onSubmit({ ...output, ...scope, parentGoalId: undefined, type: "mastery" });
          return;
        }
        //? Select が返すのはただの文字列。一覧から引き当てて Id のブランドを取り戻す
        const nextParent = goals.find((candidate) => candidate._id === output.parentGoalId);
        if (nextParent === undefined) {
          setErrors(form, { errors: [PARENT_NOT_FOUND_MESSAGE], path: ["parentGoalId"] });
          return;
        }
        onSubmit({ ...output, ...scope, parentGoalId: nextParent._id, type: "mastery" });
      }}
    >
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => <GoalContentField contentLabel={copy.contentLabel} field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["criterion"]}>
            {(field) => <GoalCriterionField field={field} />}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <GoalDateField
            clearable
            description={hasChildCheckpoints ? CHECKPOINT_HAS_CHILDREN_MESSAGE : undefined}
            disabled={hasChildCheckpoints}
            field={deadlineField}
            label={OPTIONAL_DEADLINE_LABEL}
            todayJst={todayJst}
          />
        </Grid.Col>
        {/*? 期限なし = 長期目標には親がない。期限が入っているときだけ親を選ばせる */}
        {deadline !== "" && !hasChildCheckpoints && (
          <Grid.Col span={12}>
            <Select
              {...parentField.props}
              data={parentGoalOptions(goals, {
                currentParentId: masteryGoal?.parentGoalId,
                selfId: masteryGoal?._id,
              })}
              error={parentField.errors?.[0]}
              label={PARENT_LABEL}
              onChange={(value) => parentField.onChange(value ?? "")}
              placeholder="選択してください"
              value={parentGoalId}
            />
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <GoalScopeField
            categories={categories}
            disabled={scopeFrozen}
            error={scopeError}
            items={items}
            onChange={setScopeValues}
            values={scopeValues}
          />
        </Grid.Col>
        {alert !== undefined && (
          <Grid.Col span={12}>
            {/*? 可逆な操作なので止めない。行き先だけを先に見せる */}
            <Alert color="blue" variant="light">
              {alert}
            </Alert>
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <GoalFormActions onCancel={onCancel} submitLabel={copy.submitLabel} />
        </Grid.Col>
      </Grid>
    </Form>
  );
}
