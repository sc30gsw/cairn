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
  //? SSR では window がないため何もしない
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

//* ページの一部が失敗したときの表示。EmptyState ではなく Alert なのは、
//* 「データが無い」ではなく「失敗した」を伝える必要があるため
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

//* ルーターのエラー境界(CatchBoundary / route の errorComponent)にそのまま渡せる形
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  return <ErrorState error={error} onRetry={reset} />;
}

//* ルートのエラー境界など、アプリの外枠ごと差し替わる場面向けの全画面表示
export function FullPageErrorState({ error, fallbackMessage, onRetry }: ErrorStateProps) {
  const { message, recovery, title } = presentError(error, fallbackMessage);

  return (
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        {/*? 全画面時はこれがページの主見出しなので、order を渡して実際の heading にする */}
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
