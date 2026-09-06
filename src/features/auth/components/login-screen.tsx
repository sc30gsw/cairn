import { Anchor, Button, Card, Center, Divider, Group, Stack, Text, Title } from "@mantine/core";

import { AuthActionFeedback } from "~/components/auth-action-feedback";
import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";
import { signInWithGoogle, signInWithPasskey } from "~/features/auth/lib/auth-actions";
import { useAuthActionTransition } from "~/hooks/use-auth-action-transition";
import { useInstallPrompt } from "~/hooks/use-install-prompt";
import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen() {
  const passkeyAction = useAuthActionTransition();
  const { standalone } = useInstallPrompt();
  const { data: publicConfig } = useAuthPublicConfig();
  const googleSignIn = publicConfig?.googleSignIn === true;

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
          {googleSignIn ? (
            <Button fullWidth onClick={signInWithGoogle} size="md" variant="light">
              Google でログイン
            </Button>
          ) : null}
          {googleSignIn && standalone ? (
            <Text c="dimmed" size="xs">
              Google でのログインはブラウザで開きます。
            </Text>
          ) : null}
          <Group gap="md" justify="center">
            <Anchor c="dimmed" href="/privacy" size="xs">
              プライバシーポリシー
            </Anchor>
            <Anchor c="dimmed" href="/terms" size="xs">
              利用規約
            </Anchor>
          </Group>
        </Stack>
      </Card>
    </Center>
  );
}
