import { Field, Form, reset, useForm } from "@formisch/react";
import { Button, Card, Grid, NumberInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { DateJst } from "~domain/jst";

import { WeeklyProgressCard } from "~/features/goals/components/weekly-progress-card";
import { ExamSchema } from "~/features/goals/schemas/exam-schema";
import { ObstacleSchema } from "~/features/goals/schemas/obstacle-schema";
import { WeeklySchema } from "~/features/goals/schemas/weekly-schema";
import type { ExamGoal, Obstacle } from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  SaveExamInput,
  SaveWeeklyInput,
  UpdateObstacleInput,
} from "~/features/goals/types/mutations";
import type { WeekPage } from "~/features/history/types/history";
import { BODY_FONT, DISPLAY_FONT } from "~/lib/theme";

type GoalsBoardProps = {
  exam: ExamGoal;
  obstacles: Obstacle[];
  onCreateObstacle: (input: CreateObstacleInput) => void;
  onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) => void;
  onSaveExam: (input: SaveExamInput) => void;
  onSaveWeekly: (minutes: SaveWeeklyInput) => void;
  onUpdateObstacle: (input: UpdateObstacleInput) => void;
  todayJst: DateJst;
  volumeMinutes: WeekPage["volumeMinutes"];
  weekEndJst: WeekPage["weekEnd"];
  weeklyGoalMinutes: WeekPage["weeklyGoalMinutes"];
};

export function GoalsBoard({
  exam,
  obstacles,
  onCreateObstacle,
  onRemoveObstacle,
  onSaveExam,
  onSaveWeekly,
  onUpdateObstacle,
  todayJst,
  volumeMinutes,
  weekEndJst,
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
    <Grid gap="md">
      <Grid.Col span={12}>
        <Title order={1}>本番目標</Title>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Card h="100%">
          <Stack gap="md">
            <Text>
              {exam.examDate} まであと {exam.daysRemaining} 日。目標 {exam.minScore}〜
              {exam.maxScore}。
            </Text>
            <Title ff={DISPLAY_FONT} fw={500} order={2}>
              {exam.daysRemaining}
              <Text c="dimmed" ff={BODY_FONT} fz="md" span>
                日
              </Text>
            </Title>
            <Form of={examForm} onSubmit={onSaveExam}>
              <Grid align="flex-end" gap="sm">
                <Grid.Col span={12}>
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
                </Grid.Col>
                <Grid.Col span={6}>
                  <Field of={examForm} path={["minScore"]}>
                    {(field) => (
                      <NumberInput
                        {...field.props}
                        error={field.errors?.[0]}
                        label="下限"
                        onChange={(value) =>
                          field.onChange(value === "" ? undefined : Number(value))
                        }
                        value={field.input}
                      />
                    )}
                  </Field>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Field of={examForm} path={["maxScore"]}>
                    {(field) => (
                      <NumberInput
                        {...field.props}
                        error={field.errors?.[0]}
                        label="上限"
                        onChange={(value) =>
                          field.onChange(value === "" ? undefined : Number(value))
                        }
                        value={field.input}
                      />
                    )}
                  </Field>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Button type="submit">本番目標を保存</Button>
                </Grid.Col>
              </Grid>
            </Form>
          </Stack>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Card h="100%">
          <Stack gap="md">
            <Title order={2}>週間ゴール</Title>
            <WeeklyProgressCard
              todayJst={todayJst}
              volumeMinutes={volumeMinutes}
              weekEndJst={weekEndJst}
              weeklyGoalMinutes={weeklyGoalMinutes}
            />
            <Form
              of={weeklyForm}
              onSubmit={(output) => {
                onSaveWeekly(output.minutes);
              }}
            >
              <Grid align="flex-end" gap="sm">
                <Grid.Col span={{ base: 12, sm: 8 }}>
                  <Field of={weeklyForm} path={["minutes"]}>
                    {(field) => (
                      <NumberInput
                        {...field.props}
                        error={field.errors?.[0]}
                        label="今週の分数ゴール"
                        min={0}
                        onChange={(value) =>
                          field.onChange(value === "" ? undefined : Number(value))
                        }
                        value={field.input}
                      />
                    )}
                  </Field>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Button fullWidth type="submit">
                    週間ゴールを保存
                  </Button>
                </Grid.Col>
              </Grid>
            </Form>
          </Stack>
        </Card>
      </Grid.Col>
      <Grid.Col span={12}>
        <Card>
          <Stack gap="md">
            <Title order={2}>障害プラン</Title>
            <Form
              of={obstacleForm}
              onSubmit={(output) => {
                onCreateObstacle(output);
                reset(obstacleForm);
              }}
            >
              <Grid align="flex-end" gap="sm">
                <Grid.Col span={{ base: 12, sm: 5 }}>
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
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 5 }}>
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
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 2 }}>
                  <Button fullWidth type="submit">
                    障害プランを追加
                  </Button>
                </Grid.Col>
              </Grid>
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
        </Card>
      </Grid.Col>
    </Grid>
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
    <Card padding="md">
      <Form
        of={form}
        onSubmit={(output) => {
          onUpdate({ ...output, planId: plan._id });
        }}
      >
        <Stack gap="sm">
          <Text>
            もし {plan.ifText} なら {plan.thenText}
          </Text>
          <Grid align="flex-end" gap="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
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
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
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
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <Button fullWidth type="submit">
                {plan.ifText}を保存
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <Button
                color="red"
                fullWidth
                onClick={() => onRemove(plan._id)}
                type="button"
                variant="subtle"
              >
                削除
              </Button>
            </Grid.Col>
          </Grid>
        </Stack>
      </Form>
    </Card>
  );
}
