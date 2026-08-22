import { Button, Card, Center, Divider, Stack, Text, Title } from "@mantine/core";
import { useState, useTransition } from "react";

import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { signInWithNotion, signInWithPasskey } from "~/features/auth/lib/auth-actions";
import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen() {
  const [passkeyError, setPasskeyError] = useState<null | string>(null);
  const [isPasskeyPending, startPasskeyTransition] = useTransition();

  function handlePasskeySignIn() {
    setPasskeyError(null);
    startPasskeyTransition(() => {
      void signInWithPasskey().then((result) => {
        if (result.errorMessage !== null) {
          setPasskeyError(result.errorMessage);
        }
      });
    });
  }

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
            loading={isPasskeyPending}
            onClick={handlePasskeySignIn}
            size="md"
            variant="light"
          >
            パスキーでログイン
          </Button>
          {passkeyError ? (
            <Text c="red" size="sm">
              {passkeyError}
            </Text>
          ) : null}
          <Button fullWidth onClick={signInWithNotion} size="md" variant="light">
            Notion でログイン
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
