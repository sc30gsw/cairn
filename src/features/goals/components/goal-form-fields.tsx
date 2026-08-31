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

const CHECKPOINT_CROWDED_THRESHOLD = 2;
export const CHECKPOINT_CROWDED_MESSAGE = "同時に追いかけるチェックポイントは1〜2件が目安です";
const PARENT_NOT_FOUND_MESSAGE = "親の目標が見つかりません。選び直してください";

export type GoalFieldsProps = {
  activeCheckpointCount: number;
  categories: CategoryDto[];
  copy: GoalFormCopy;
  goal: Goal | undefined;
  goals: Goal[];
  hasChildCheckpoints: boolean;
  items: ItemDto[];
  onCancel: () => void;
  onSubmit: (goal: GoalInputPayload) => void;
  parent: ParentGoal | undefined;
  todayJst: DateJst;
};

const SCOPE_LABEL = "実績に数える項目";

type GoalScopeFieldProps = {
  categories: CategoryDto[];
  disabled: boolean;
  error: string | undefined;
  items: ItemDto[];
  onChange: (values: string[]) => void;
  values: string[];
};

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

function initialScopeValues(goal: MasteryGoal | undefined, parent: ParentGoal | undefined) {
  if (goal !== undefined) {
    return goal.scopeItemIds ?? [];
  }
  return (parent?.type === "mastery" ? parent.scopeItemIds : undefined) ?? [];
}

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
          onSubmit({ ...output, ...scope, parentGoalId: undefined, type: "mastery" });
          return;
        }
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
