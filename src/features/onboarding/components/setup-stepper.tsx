import { Alert, Anchor, Badge, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { Stepper } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import type { SetupStep } from "~/features/onboarding/lib/setup-steps";
import { SETUP_STEPS } from "~/features/onboarding/lib/setup-steps";

type SetupStepperProps = {
  activeStep: SetupStep;
  onDismiss: () => void;
};

export function SetupStepper({ activeStep, onDismiss }: SetupStepperProps) {
  const activeIndex = SETUP_STEPS.findIndex((step) => step.id === activeStep.id);

  return (
    <Alert color="orange" title="はじめのセットアップ" variant="light">
      <Stack gap="md">
        <Text size="sm">
          記録を始める前に、項目・プリセット・目標を順に整えましょう。一度に全部やる必要はありません。
        </Text>
        <Stepper active={activeIndex} orientation="vertical" size="sm">
          {SETUP_STEPS.map((step) => (
            <Stepper.Step
              description={step.description}
              key={step.id}
              label={
                <Tooltip label={step.tooltip} multiline maw={280} withArrow>
                  <Text component="span" size="sm">
                    {step.label}
                  </Text>
                </Tooltip>
              }
            />
          ))}
        </Stepper>
        <Stack gap="xs">
          <Group gap="xs">
            <Badge color="gray" variant="light">
              ヒント
            </Badge>
            <Text size="sm">{activeStep.sampleHint}</Text>
          </Group>
          <Group gap="sm">
            <Button component={Link} size="xs" to={activeStep.href}>
              {activeStep.label}
            </Button>
            <Button onClick={onDismiss} size="xs" type="button" variant="subtle">
              あとで設定
            </Button>
          </Group>
          <Text size="xs">
            <Anchor component={Link} to="/my-page">
              マイページで全体を見る
            </Anchor>
          </Text>
        </Stack>
      </Stack>
    </Alert>
  );
}
