import { Anchor, Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import type { SetupStatus } from "~/../convex/lib/setupStatus";
import { SETUP_STEPS, isSetupStepComplete } from "~/features/onboarding/lib/setup-steps";

type SetupChecklistProps = {
  status: SetupStatus;
};

export function SetupChecklist({ status }: SetupChecklistProps) {
  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>セットアップ</Title>
        <Text c="dimmed" size="sm">
          未設定の項目があります。各画面で登録してください。
        </Text>
        <Stack gap="sm">
          {SETUP_STEPS.map((step) => {
            const complete = isSetupStepComplete(status, step.id);
            return (
              <Group gap="sm" justify="space-between" key={step.id} wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Badge color={complete ? "green" : "orange"} variant="light">
                    {complete ? "完了" : "未設定"}
                  </Badge>
                  <Text size="sm">{step.label}</Text>
                </Group>
                {!complete ? (
                  <Anchor component={Link} size="sm" to={step.href}>
                    設定する
                  </Anchor>
                ) : null}
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
