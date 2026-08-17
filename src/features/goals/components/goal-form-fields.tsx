import { Field, Form, useForm } from "@formisch/react";
import { Button, Grid, Group, NumberInput, Select, Textarea, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { PACE_LIMITS, TOEIC_SCORE, VOLUME_UNITS } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { isVolumeUnit } from "~/features/goals/lib/goal-guards";
import {
  ExamGoalFieldsSchema,
  MasteryGoalFieldsSchema,
  OtherGoalFieldsSchema,
  PaceGoalFieldsSchema,
  VolumeGoalFieldsSchema,
  type GoalFormOutput,
} from "~/features/goals/schemas/goal-schema";
import type {
  ExamGoal,
  MasteryGoal,
  OtherGoal,
  PaceGoal,
  VolumeGoal,
} from "~/features/goals/types/goal";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { onRequiredSelect } from "~/lib/select";

const CONTENT_LABEL = "目標の内容";
const CONTENT_PLACEHOLDER = "例: 金のフレーズを1 Unit 音読する";

export type GoalFieldsProps<TGoal> = {
  goal: TGoal | undefined;
  onCancel: () => void;
  onSubmit: (goal: GoalFormOutput) => void;
  todayJst: DateJst;
};

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

export function ExamGoalFields({ goal, onCancel, onSubmit, todayJst }: GoalFieldsProps<ExamGoal>) {
  const form = useForm({
    initialInput: {
      content: goal?.content ?? "",
      examDate: goal?.examDate ?? "",
      maxScore: goal?.maxScore,
      minScore: goal?.minScore,
    },
    schema: ExamGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "exam" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                error={field.errors?.[0]}
                label={CONTENT_LABEL}
                placeholder={CONTENT_PLACEHOLDER}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["examDate"]}>
            {(field) => (
              <DatePickerInput
                classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
                error={field.errors?.[0]}
                firstDayOfWeek={1}
                getDayProps={(date) => calendarDayProps(date, todayJst)}
                label="本番日"
                locale="ja"
                name={field.props.name}
                onChange={(value) => field.onChange(value ?? "")}
                popoverProps={{ withinPortal: true }}
                value={field.input}
                valueFormat="YYYY-MM-DD"
              />
            )}
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

export function PaceGoalFields({ goal, onCancel, onSubmit }: GoalFieldsProps<PaceGoal>) {
  const form = useForm({
    initialInput: {
      content: goal?.content ?? "",
      dailyFloorMinutes: goal?.dailyFloorMinutes,
      daysPerWeek: goal?.daysPerWeek,
    },
    schema: PaceGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "pace" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                error={field.errors?.[0]}
                label={CONTENT_LABEL}
                placeholder={CONTENT_PLACEHOLDER}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={6}>
          <Field of={form} path={["daysPerWeek"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="週の実施日数"
                max={PACE_LIMITS.maxDays}
                min={PACE_LIMITS.minDays}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                suffix=" 日"
                value={field.input ?? ""}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={6}>
          <Field of={form} path={["dailyFloorMinutes"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="1日あたり最低分数"
                min={PACE_LIMITS.minFloorMinutes}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                suffix=" 分"
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

export function VolumeGoalFields({
  goal,
  onCancel,
  onSubmit,
  todayJst,
}: GoalFieldsProps<VolumeGoal>) {
  const form = useForm({
    initialInput: {
      content: goal?.content ?? "",
      deadline: goal?.deadline ?? "",
      startAmount: goal?.startAmount ?? 0,
      targetAmount: goal?.targetAmount,
      unit: goal?.unit ?? VOLUME_UNITS[0],
    },
    schema: VolumeGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "volume" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                error={field.errors?.[0]}
                label={CONTENT_LABEL}
                placeholder={CONTENT_PLACEHOLDER}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Field of={form} path={["targetAmount"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="目標量"
                min={1}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                value={field.input ?? ""}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Field of={form} path={["unit"]}>
            {(field) => (
              <Select
                allowDeselect={false}
                data={[...VOLUME_UNITS]}
                error={field.errors?.[0]}
                label="単位"
                name={field.props.name}
                onChange={onRequiredSelect((value) => {
                  if (isVolumeUnit(value)) {
                    field.onChange(value);
                  }
                })}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Field of={form} path={["startAmount"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="開始時点の量"
                min={0}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                value={field.input ?? ""}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["deadline"]}>
            {(field) => (
              <DatePickerInput
                classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
                error={field.errors?.[0]}
                firstDayOfWeek={1}
                getDayProps={(date) => calendarDayProps(date, todayJst)}
                label="期限"
                locale="ja"
                name={field.props.name}
                onChange={(value) => field.onChange(value ?? "")}
                popoverProps={{ withinPortal: true }}
                value={field.input}
                valueFormat="YYYY-MM-DD"
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
  goal,
  onCancel,
  onSubmit,
  todayJst,
}: GoalFieldsProps<MasteryGoal>) {
  const form = useForm({
    initialInput: {
      content: goal?.content ?? "",
      criterion: goal?.criterion ?? "",
      deadline: goal?.deadline ?? "",
    },
    schema: MasteryGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "mastery" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                error={field.errors?.[0]}
                label={CONTENT_LABEL}
                placeholder={CONTENT_PLACEHOLDER}
                value={field.input}
              />
            )}
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
              <DatePickerInput
                classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
                clearable
                error={field.errors?.[0]}
                firstDayOfWeek={1}
                getDayProps={(date) => calendarDayProps(date, todayJst)}
                label="期限（任意）"
                locale="ja"
                name={field.props.name}
                onChange={(value) => field.onChange(value ?? "")}
                popoverProps={{ withinPortal: true }}
                value={field.input ?? ""}
                valueFormat="YYYY-MM-DD"
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

export function OtherGoalFields({
  goal,
  onCancel,
  onSubmit,
  todayJst,
}: GoalFieldsProps<OtherGoal>) {
  const form = useForm({
    initialInput: {
      content: goal?.content ?? "",
      deadline: goal?.deadline ?? "",
      memo: goal?.memo ?? "",
    },
    schema: OtherGoalFieldsSchema,
  });

  return (
    <Form of={form} onSubmit={(output) => onSubmit({ ...output, type: "other" })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={12}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                error={field.errors?.[0]}
                label={CONTENT_LABEL}
                placeholder={CONTENT_PLACEHOLDER}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["deadline"]}>
            {(field) => (
              <DatePickerInput
                classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
                clearable
                error={field.errors?.[0]}
                firstDayOfWeek={1}
                getDayProps={(date) => calendarDayProps(date, todayJst)}
                label="期限（任意）"
                locale="ja"
                name={field.props.name}
                onChange={(value) => field.onChange(value ?? "")}
                popoverProps={{ withinPortal: true }}
                value={field.input ?? ""}
                valueFormat="YYYY-MM-DD"
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={12}>
          <Field of={form} path={["memo"]}>
            {(field) => (
              <Textarea
                {...field.props}
                autosize
                error={field.errors?.[0]}
                label="メモ（任意）"
                minRows={2}
                value={field.input}
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
