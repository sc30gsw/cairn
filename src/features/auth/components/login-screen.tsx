import { Button, Card, Center, Divider, Stack, Text, Title } from "@mantine/core";

import { DevEmailLoginForm } from "~/features/auth/components/dev-email-login-form";
import { DISPLAY_FONT } from "~/lib/theme";

type LoginScreenProps = {
  onNotionSignIn: () => void;
  showDevEmailAuth: boolean;
  showNotionSignIn: boolean;
};

export function LoginScreen({
  onNotionSignIn,
  showDevEmailAuth,
  showNotionSignIn,
}: LoginScreenProps) {
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
          <Text>
            {showDevEmailAuth
              ? "所有者のアカウントで入る。記録はアプリが正本です。"
              : "所有者の Notion アカウントで入る。記録はアプリが正本です。"}
          </Text>
          {showDevEmailAuth ? <DevEmailLoginForm /> : null}
          {showDevEmailAuth && showNotionSignIn ? (
            <Divider label="または" labelPosition="center" />
          ) : null}
          {showNotionSignIn ? (
            <Button
              fullWidth
              onClick={onNotionSignIn}
              size="md"
              variant={showDevEmailAuth ? "light" : "filled"}
            >
              Notion でログイン
            </Button>
          ) : null}
        </Stack>
      </Card>
    </Center>
  );
}
