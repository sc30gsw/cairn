import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NumberInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { FunctionReturnType } from "convex/server";
import * as v from "valibot";

import type { api } from "~/../convex/_generated/api";

const ExamSchema = v.object({
  examDate: v.pipe(v.string(), v.minLength(1)),
  maxScore: v.pipe(v.number(), v.minValue(0)),
  minScore: v.pipe(v.number(), v.minValue(0)),
});

const WeeklySchema = v.object({
  minutes: v.pipe(v.number(), v.minValue(0, "週間ゴールは0分以上です")),
});

const ObstacleSchema = v.object({
  ifText: v.pipe(v.string(), v.minLength(1, "if は必須です")),
  thenText: v.pipe(v.string(), v.minLength(1, "then は必須です")),
});

type ExamGoal = FunctionReturnType<typeof api.goals.getExam>;
type Obstacle = FunctionReturnType<typeof api.goals.listObstacles>[number];

type GoalsBoardProps = {
  exam: ExamGoal;
  obstacles: Obstacle[];
  onCreateObstacle: (input: { ifText: string; thenText: string }) => void;
  onRemoveObstacle: (planId: Obstacle["_id"]) => void;
  onSaveExam: (input: { examDate: string; maxScore: number; minScore: number }) => void;
  onSaveWeekly: (minutes: number) => void;
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
        <Group key={plan._id} justify="space-between">
          <Text>
            もし {plan.ifText} なら {plan.thenText}
          </Text>
          <Button color="red" onClick={() => onRemoveObstacle(plan._id)} variant="subtle">
            削除
          </Button>
        </Group>
      ))}
    </Stack>
  );
}
