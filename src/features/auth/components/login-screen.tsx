import { Anchor, Button, Card, Center, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthActionFeedback } from "~/components/auth-action-feedback";
import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";
import { signInWithGoogle, signInWithPasskey } from "~/features/auth/lib/auth-actions";
import { useAuthActionTransition } from "~/hooks/use-auth-action-transition";
import { useInstallPrompt } from "~/hooks/use-install-prompt";
import { PASSKEY_OAUTH_PENDING_KEY, writePasskeySessionFlag } from "~/lib/passkey-storage";
import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen() {
  const passkeyAction = useAuthActionTransition();
  const googleAction = useAuthActionTransition();
  const searchStr = useLocation({ select: (location) => location.searchStr });
  const oauthFailed = new URLSearchParams(searchStr).get("authError") === "google";
  const { standalone } = useInstallPrompt();
  const { data: publicConfig } = useAuthPublicConfig();
  const googleSignIn = publicConfig?.googleSignIn === true;

  useEffect(() => {
    if (oauthFailed) {
      writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, false);
    }
  }, [oauthFailed]);

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
            <>
              <Button
                fullWidth
                loading={googleAction.isPending}
                onClick={() => void googleAction.run(signInWithGoogle)}
                size="md"
                variant="light"
              >
                Googleでログイン
              </Button>
              <div aria-live="polite">
                <AuthActionFeedback result={googleAction.result} />
              </div>
            </>
          ) : null}
          {oauthFailed && googleAction.result === null && !googleAction.isPending ? (
            <Text c="red" role="alert" size="sm">
              Google でのログインを完了できませんでした。もう一度お試しください。
            </Text>
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
