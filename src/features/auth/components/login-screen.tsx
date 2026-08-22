import { Button, Card, Center, Divider, Stack, Text, Title } from "@mantine/core";

import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { AuthActionFeedback } from "~/features/auth/components/auth-action-feedback";
import { useAuthActionTransition } from "~/features/auth/hooks/use-auth-action-transition";
import { signInWithNotion, signInWithPasskey } from "~/features/auth/lib/auth-actions";
import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen() {
  const passkeyAction = useAuthActionTransition();

  return (
    <Center h="100dvh">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <Stack gap="md">
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            紙の記録
          </Text>
          <Title ff={DISPLAY_FONT} fw={500} order={1}>
            学習ログ
          </Title>
          <Text>アカウントで入る。記録はアプリが正本です。</Text>
          <AccountAuthPanel />
          <Divider label="または" labelPosition="center" />
          <Button
            fullWidth
            loading={passkeyAction.isPending}
            onClick={() => void passkeyAction.run(() => signInWithPasskey())}
            size="md"
            variant="light"
          >
            パスキーでログイン
          </Button>
          <AuthActionFeedback result={passkeyAction.result} />
          <Button fullWidth onClick={signInWithNotion} size="md" variant="light">
            Notion でログイン
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
