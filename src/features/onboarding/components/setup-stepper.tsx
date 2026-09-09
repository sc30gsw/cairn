import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Stack,
  Stepper,
  type StepperStepProps,
  Text,
  Tooltip,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";

import type { SetupStep, SetupStepId } from "~/features/onboarding/lib/setup-steps";
import { isSetupStepComplete, SETUP_STEPS } from "~/features/onboarding/lib/setup-steps";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";

import classes from "~/features/onboarding/components/setup-stepper.module.css";

type SetupStepperProps = {
  activeStep: SetupStep;
  dismissed: ReadonlySet<SetupStepId>;
  onDismiss: () => void;
  status: SetupStatus;
};

type SetupProgressStepProps = Omit<StepperStepProps, "state"> & {
  setupState: NonNullable<StepperStepProps["state"]>;
};

function SetupProgressStep({ setupState, ...props }: SetupProgressStepProps) {
  return <Stepper.Step {...props} state={setupState} />;
}

export function SetupStepper({ activeStep, dismissed, onDismiss, status }: SetupStepperProps) {
  return (
    <Alert color="orange" title="はじめのセットアップ" variant="light">
      <Stack gap="md">
        <Text size="sm">
          記録を始める前に、項目・プリセット・目標を順に整えましょう。一度に全部やる必要はありません。
        </Text>
        <Stepper
          active={-1}
          aria-label="セットアップの進み具合"
          classNames={classes}
          labelPosition="bottom"
          size="sm"
          wrap={false}
        >
          {SETUP_STEPS.map((step) => {
            const completed = isSetupStepComplete(status, step.id);
            const current = step.id === activeStep.id;
            const statusLabel = completed
              ? "完了"
              : current
                ? "次の設定"
                : dismissed.has(step.id)
                  ? "あとで設定"
                  : "未設定";

            return (
              <SetupProgressStep
                aria-current={current ? "step" : undefined}
                aria-label={`${step.label}: ${statusLabel}`}
                color={completed ? "green" : "orange"}
                description={step.description}
                key={step.id}
                label={
                  <Tooltip label={step.tooltip} multiline maw={280} withArrow>
                    <Text component="span" size="sm">
                      {step.label}
                      <Text
                        c={completed ? "green" : "dimmed"}
                        component="span"
                        display="block"
                        mt={4}
                        size="xs"
                      >
                        {statusLabel}
                      </Text>
                    </Text>
                  </Tooltip>
                }
                setupState={completed ? "stepCompleted" : current ? "stepProgress" : "stepInactive"}
              />
            );
          })}
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
