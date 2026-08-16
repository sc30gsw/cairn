import { Alert, Button, Card, Center, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertTriangle, IconLogin, IconRefresh, IconRotate } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { presentError, type ErrorRecovery } from "~/lib/error-presentation";
import { DISPLAY_FONT } from "~/lib/theme";

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

function reloadPage() {
  //? SSR では window がないため何もしない
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

//* 例外の唯一の表示コンポーネント。文言は presentError が用意した利用者向けの文だけを描画し、
//* 生の error.message は決して出さない(開発時の詳細はブラウザのコンソールに残る)
export function ErrorState({ error, fallbackMessage, onRetry }: ErrorStateProps) {
  const { message, recovery, title } = presentError(error, fallbackMessage);
  const RecoveryIcon = RECOVERY_ICONS[recovery];

  return (
    <Alert
      color={recovery === "signIn" ? "yellow" : "red"}
      icon={<IconAlertTriangle aria-hidden size={20} />}
      title={title}
      variant="light"
    >
      <Stack align="flex-start" gap="sm">
        <Text size="sm">{message}</Text>
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
  return (
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="red" radius="xl" size="lg" variant="light">
              <IconAlertTriangle aria-hidden size={20} />
            </ThemeIcon>
            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
              学習ログ
            </Text>
          </Group>
          <Title ff={DISPLAY_FONT} fw={500} order={1}>
            うまく開けませんでした
          </Title>
          <ErrorState error={error} fallbackMessage={fallbackMessage} onRetry={onRetry} />
        </Stack>
      </Card>
    </Center>
  );
}
