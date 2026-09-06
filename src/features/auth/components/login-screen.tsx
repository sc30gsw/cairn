import {
  Anchor,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
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

import classes from "~/features/auth/components/login-screen.module.css";

export function LoginScreen() {
  const passkeyAction = useAuthActionTransition();
  const googleAction = useAuthActionTransition();
  const searchStr = useLocation({ select: (location) => location.searchStr });
  const oauthFailed = new URLSearchParams(searchStr).get("authError") === "google";
  const { standalone } = useInstallPrompt();
  const { data: publicConfig, isPending, isFetching, isError, refetch } = useAuthPublicConfig();
  const checkingGoogle = isPending || (publicConfig === undefined && isFetching);
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
          {checkingGoogle || googleSignIn ? (
            <div>
              {checkingGoogle ? (
                <VisuallyHidden component="output">ログイン方法を確認中</VisuallyHidden>
              ) : null}
              <Skeleton animate={false} className={classes.googleSkeleton} visible={checkingGoogle}>
                <Button
                  aria-hidden={checkingGoogle || undefined}
                  disabled={checkingGoogle}
                  fullWidth
                  loading={googleAction.isPending}
                  onClick={() => void googleAction.run(signInWithGoogle)}
                  size="md"
                  variant="light"
                >
                  Googleでログイン
                </Button>
              </Skeleton>
              <div aria-live="polite">
                <AuthActionFeedback result={googleAction.result} />
              </div>
            </div>
          ) : isError && publicConfig === undefined ? (
            <Stack gap="xs">
              <Text c="dimmed" component="output" size="sm">
                Googleログインを利用できるか確認できませんでした。
              </Text>
              <Button fullWidth onClick={() => void refetch()} size="md" variant="light">
                もう一度確認する
              </Button>
            </Stack>
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
