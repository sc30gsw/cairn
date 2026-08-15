import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NumberInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";

import { ExamSchema } from "~/features/goals/schemas/exam-schema";
import { ObstacleSchema } from "~/features/goals/schemas/obstacle-schema";
import { WeeklySchema } from "~/features/goals/schemas/weekly-schema";
import type { ExamGoal, Obstacle } from "~/features/goals/types/goal";

type GoalsBoardProps = {
  exam: ExamGoal;
  obstacles: Obstacle[];
  onCreateObstacle: (input: { ifText: string; thenText: string }) => void;
  onRemoveObstacle: (planId: Obstacle["_id"]) => void;
  onSaveExam: (input: { examDate: string; maxScore: number; minScore: number }) => void;
  onSaveWeekly: (minutes: number) => void;
  onUpdateObstacle: (input: { ifText: string; planId: Obstacle["_id"]; thenText: string }) => void;
  volumeMinutes: number;
  weeklyGoalMinutes: null | number;
};

export function GoalsBoard({
  exam,
  obstacles,
  onCreateObstacle,
  onRemoveObstacle,
  onSaveExam,
  onSaveWeekly,
  onUpdateObstacle,
  volumeMinutes,
  weeklyGoalMinutes,
}: GoalsBoardProps) {
  const examForm = useForm({
    initialInput: {
      examDate: exam.examDate,
      maxScore: exam.maxScore,
      minScore: exam.minScore,
    },
    schema: ExamSchema,
  });
  const weeklyForm = useForm({
    initialInput: { minutes: weeklyGoalMinutes ?? 0 },
    schema: WeeklySchema,
  });
  const obstacleForm = useForm({
    initialInput: { ifText: "", thenText: "" },
    schema: ObstacleSchema,
  });

  return (
    <Stack gap="lg">
      <Title order={1}>本番目標</Title>
      <Text>
        {exam.examDate} まであと {exam.daysRemaining} 日。目標 {exam.minScore}〜{exam.maxScore}。
      </Text>
      <Form of={examForm} onSubmit={onSaveExam}>
        <Group align="flex-end">
          <Field of={examForm} path={["examDate"]}>
            {(field) => (
              <DateInput
                {...field.props}
                error={field.errors?.[0]}
                label="本番日"
                onChange={(value) => field.onChange(value ?? "")}
                value={field.input}
                valueFormat="YYYY-MM-DD"
              />
            )}
          </Field>
          <Field of={examForm} path={["minScore"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="下限"
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                value={field.input}
              />
            )}
          </Field>
          <Field of={examForm} path={["maxScore"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="上限"
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                value={field.input}
              />
            )}
          </Field>
          <Button type="submit">本番目標を保存</Button>
        </Group>
      </Form>
      <Title order={2}>週間ゴール</Title>
      <Text>
        今週の学習量 {volumeMinutes}分 / ゴール {weeklyGoalMinutes ?? "未設定"}分
      </Text>
      <Form
        of={weeklyForm}
        onSubmit={(output) => {
          onSaveWeekly(output.minutes);
        }}
      >
        <Group align="flex-end">
          <Field of={weeklyForm} path={["minutes"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                error={field.errors?.[0]}
                label="今週の分数ゴール"
                min={0}
                onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                value={field.input}
              />
            )}
          </Field>
          <Button type="submit">週間ゴールを保存</Button>
        </Group>
      </Form>
      <Title order={2}>障害プラン</Title>
      <Form of={obstacleForm} onSubmit={onCreateObstacle}>
        <Group align="flex-end">
          <Field of={obstacleForm} path={["ifText"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="もし"
                value={field.input}
              />
            )}
          </Field>
          <Field of={obstacleForm} path={["thenText"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="なら"
                value={field.input}
              />
            )}
          </Field>
          <Button type="submit">障害プランを追加</Button>
        </Group>
      </Form>
      {obstacles.map((plan) => (
        <ObstacleEditor
          key={plan._id}
          onRemove={onRemoveObstacle}
          onUpdate={onUpdateObstacle}
          plan={plan}
        />
      ))}
    </Stack>
  );
}

function ObstacleEditor({
  onRemove,
  onUpdate,
  plan,
}: {
  onRemove: GoalsBoardProps["onRemoveObstacle"];
  onUpdate: GoalsBoardProps["onUpdateObstacle"];
  plan: Obstacle;
}) {
  const form = useForm({
    initialInput: { ifText: plan.ifText, thenText: plan.thenText },
    schema: ObstacleSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onUpdate({ ...output, planId: plan._id });
      }}
    >
      <Group align="flex-end" justify="space-between">
        <Text>
          もし {plan.ifText} なら {plan.thenText}
        </Text>
        <Field of={form} path={["ifText"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${plan.ifText}のもし`}
              error={field.errors?.[0]}
              value={field.input}
            />
          )}
        </Field>
        <Field of={form} path={["thenText"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${plan.ifText}のなら`}
              error={field.errors?.[0]}
              value={field.input}
            />
          )}
        </Field>
        <Button type="submit">{plan.ifText}を保存</Button>
        <Button color="red" onClick={() => onRemove(plan._id)} type="button" variant="subtle">
          削除
        </Button>
      </Group>
    </Form>
  );
}
