import { Field, Form, reset, useForm, type SubmitHandler } from "@formisch/react";
import { Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { useEffect } from "react";
import { TOEIC_SCORE } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { GoalDateField } from "~/features/goals/components/goal-form-fields";
import {
  ExamResultSchema,
  type ExamResultInput,
} from "~/features/goals/schemas/exam-result-schema";
import type { ExamGoal } from "~/features/goals/types/goal";

export const EXAM_RESULT_MODAL_TITLE = "本番の結果を入れる";
export const EXAM_RESULT_CORRECT_TITLE = "本番の結果を訂正する";
export const EXAM_RESULT_SCORE_LABEL = "結果スコア";
export const EXAM_RESULT_DATE_LABEL = "結果を入れた日";
export const EXAM_RESULT_SUBMIT = "結果を保存";
export const EXAM_RESULT_HINT =
  "結果は1本番につき1つだけ。入れると本番目標は終了して「達成した目標」に並び、次の本番を作れます。取り消しはできませんが、あとから訂正できます。";

type ExamResultModalProps = {
  goal: ExamGoal | null;
  onClose: () => void;
  onSubmit: (result: ExamResultInput) => void | Promise<void>;
  todayJst: DateJst;
};

function initialInputOf(goal: ExamGoal | null, todayJst: DateJst) {
  return {
    recordedAt: goal?.result?.recordedAt ?? todayJst,
    score: goal?.result?.score,
  };
}

export function ExamResultModal({ goal, onClose, onSubmit, todayJst }: ExamResultModalProps) {
  const form = useForm({
    initialInput: initialInputOf(goal, todayJst),
    schema: ExamResultSchema,
  });

  useEffect(() => {
    if (goal === null) {
      return;
    }
    reset(form, { initialInput: initialInputOf(goal, todayJst), keepInput: false });
  }, [form, goal, todayJst]);

  const handleSubmit: SubmitHandler<typeof ExamResultSchema> = async (values) => {
    await onSubmit(values);
    onClose();
  };
  const correcting = goal?.result !== undefined;

  return (
    <Modal
      onClose={onClose}
      opened={goal !== null}
      title={correcting ? EXAM_RESULT_CORRECT_TITLE : EXAM_RESULT_MODAL_TITLE}
    >
      <Form of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm">
            「{goal?.content}」（本番日 {goal?.examDate}、目標 {goal?.minScore}〜{goal?.maxScore}
            ）の結果を入れます。
          </Text>
          <Text c="dimmed" size="sm">
            {EXAM_RESULT_HINT}
          </Text>
          <Field of={form} path={["score"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label={EXAM_RESULT_SCORE_LABEL}
                max={TOEIC_SCORE.max}
                min={TOEIC_SCORE.min}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                step={TOEIC_SCORE.step}
                value={field.input ?? ""}
              />
            )}
          </Field>
          <Field of={form} path={["recordedAt"]}>
            {(field) => (
              <GoalDateField field={field} label={EXAM_RESULT_DATE_LABEL} todayJst={todayJst} />
            )}
          </Field>
          <Group gap="sm" justify="flex-end">
            <Button onClick={onClose} type="button" variant="default">
              キャンセル
            </Button>
            <Button color="green" loading={form.isSubmitting} type="submit">
              {EXAM_RESULT_SUBMIT}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
