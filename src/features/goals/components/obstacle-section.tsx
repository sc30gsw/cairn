import { Field, Form, reset, useForm, type FormStore } from "@formisch/react";
import { Box, Button, Card, Grid, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect } from "react";
import { OBSTACLE_THEN_PLACEHOLDER } from "~domain/concreteActionCore";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { ConcreteThenFieldLabel } from "~/components/concrete-then-field-label";
import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { ObstacleSchema } from "~/features/goals/schemas/obstacle-schema";
import type { Obstacle } from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  UpdateObstacleInput,
} from "~/features/goals/types/mutations";

type ObstacleSectionProps = {
  obstacles: Obstacle[];
  onCreateObstacle: (input: CreateObstacleInput) => void;
  onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) => void;
  onUpdateObstacle: (input: UpdateObstacleInput) => void;
};

export function ObstacleSection({
  obstacles,
  onCreateObstacle,
  onRemoveObstacle,
  onUpdateObstacle,
}: ObstacleSectionProps) {
  const obstacleForm = useForm({
    initialInput: { ifText: "", thenText: "" },
    schema: ObstacleSchema,
  });

  return (
    <Stack gap="md">
      <Group gap="xs" wrap="nowrap">
        <Title order={2}>障害プラン</Title>
        <ConcreteActionTourTrigger />
      </Group>
      <Form
        of={obstacleForm}
        onSubmit={(output) => {
          onCreateObstacle(output);
          reset(obstacleForm);
        }}
      >
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <ObstacleIfField form={obstacleForm} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.obstacles}>
              <Field of={obstacleForm} path={["thenText"]}>
                {(field) => (
                  <ConcreteActionField
                    {...field.props}
                    error={field.errors?.[0]}
                    label={<ConcreteThenFieldLabel />}
                    placeholder={OBSTACLE_THEN_PLACEHOLDER}
                    value={field.input}
                    wrapLabel={false}
                  />
                )}
              </Field>
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 2 }}>
            <LabelAlignedCell>
              <Button fullWidth type="submit">
                障害プランを追加
              </Button>
            </LabelAlignedCell>
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
  );
}

function ObstacleIfField({ form }: Record<"form", FormStore<typeof ObstacleSchema>>) {
  return (
    <Field of={form} path={["ifText"]}>
      {(field) => (
        <TextInput {...field.props} error={field.errors?.[0]} label="もし" value={field.input} />
      )}
    </Field>
  );
}

type ObstacleEditorProps = {
  onRemove: ObstacleSectionProps["onRemoveObstacle"];
  onUpdate: ObstacleSectionProps["onUpdateObstacle"];
  plan: Obstacle;
};

function ObstacleEditor({ onRemove, onUpdate, plan }: ObstacleEditorProps) {
  const form = useForm({
    initialInput: { ifText: plan.ifText, thenText: plan.thenText },
    schema: ObstacleSchema,
  });

  useEffect(() => {
    if (form.isDirty) {
      return;
    }
    reset(form, { initialInput: { ifText: plan.ifText, thenText: plan.thenText } });
  }, [form, plan.ifText, plan.thenText]);

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
            もし{" "}
            <Text
              component="span"
              style={{ borderBottom: "2px solid var(--mantine-color-orange-4)" }}
            >
              {plan.ifText}
            </Text>{" "}
            なら{" "}
            <Text
              component="span"
              style={{ borderBottom: "2px solid var(--mantine-color-green-6)" }}
            >
              {plan.thenText}
            </Text>
          </Text>
          <Grid align="flex-start" gap="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Field of={form} path={["ifText"]}>
                {(field) => (
                  <TextInput
                    {...field.props}
                    aria-label={`${plan.ifText}のもし`}
                    error={field.errors?.[0]}
                    label=" "
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Field of={form} path={["thenText"]}>
                {(field) => (
                  <ConcreteActionField
                    {...field.props}
                    aria-label={`${plan.ifText}のなら`}
                    error={field.errors?.[0]}
                    label={<ConcreteThenFieldLabel />}
                    placeholder={OBSTACLE_THEN_PLACEHOLDER}
                    value={field.input}
                    wrapLabel={false}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <LabelAlignedCell>
                <Button fullWidth type="submit">
                  {plan.ifText}を保存
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <LabelAlignedCell>
                <Button
                  color="red"
                  fullWidth
                  onClick={() => onRemove(plan._id)}
                  type="button"
                  variant="subtle"
                >
                  削除
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
          </Grid>
        </Stack>
      </Form>
    </Card>
  );
}
