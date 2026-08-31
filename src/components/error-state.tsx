import { Alert, Button, Card, Center, EmptyState, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconLogin, IconRefresh, IconRotate } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { presentError, type ErrorRecovery } from "~/lib/error-presentation";

const RECOVERY_LABELS = {
  reload: "最新の状態に更新",
  retry: "もう一度試す",
  signIn: "ログインし直す",
} as const satisfies Record<ErrorRecovery, string>;

const RECOVERY_ICONS = {
  reload: IconRefresh,
  retry: IconRotate,
  signIn: IconLogin,
} as const satisfies Record<ErrorRecovery, typeof IconRefresh>;

type ErrorStateProps = {
  error: unknown;
  fallbackMessage?: string;
  onRetry?: () => void;
};

type RecoveryProps = Record<"recovery", ErrorRecovery>;

function reloadPage() {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

function RecoveryButton({ onRetry, recovery }: Pick<ErrorStateProps, "onRetry"> & RecoveryProps) {
  const RecoveryIcon = RECOVERY_ICONS[recovery];

  return (
    <Button
      color={recovery === "signIn" ? "yellow" : "red"}
      leftSection={<RecoveryIcon aria-hidden size={16} />}
      onClick={recovery === "retry" && onRetry !== undefined ? onRetry : reloadPage}
      size="xs"
      type="button"
      variant="light"
    >
      {RECOVERY_LABELS[recovery]}
    </Button>
  );
}

export function ErrorState({ error, fallbackMessage, onRetry }: ErrorStateProps) {
  const { message, recovery, title } = presentError(error, fallbackMessage);

  return (
    <Alert
      color={recovery === "signIn" ? "yellow" : "red"}
      icon={<IconAlertTriangle aria-hidden size={20} />}
      title={title}
      variant="light"
    >
      <Stack align="flex-start" gap="sm">
        <Text size="sm">{message}</Text>
        <RecoveryButton onRetry={onRetry} recovery={recovery} />
      </Stack>
    </Alert>
  );
}

export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  return <ErrorState error={error} onRetry={reset} />;
}

export function FullPageErrorState({ error, fallbackMessage, onRetry }: ErrorStateProps) {
  const { message, recovery, title } = presentError(error, fallbackMessage);

  return (
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <EmptyState color={recovery === "signIn" ? "yellow" : "red"} size="md" variant="light">
          <EmptyState.Indicator>
            <IconAlertTriangle aria-hidden />
          </EmptyState.Indicator>
          <EmptyState.Title order={1}>{title}</EmptyState.Title>
          <EmptyState.Description>{message}</EmptyState.Description>
          <EmptyState.Actions>
            <RecoveryButton onRetry={onRetry} recovery={recovery} />
          </EmptyState.Actions>
        </EmptyState>
      </Card>
    </Center>
  );
}
