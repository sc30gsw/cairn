import { Button, Card, Center, Divider, Stack, Text, Title } from "@mantine/core";

import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";
import { signInWithNotion } from "~/features/auth/lib/auth-actions";
import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen() {
  const publicConfig = useAuthPublicConfig();
  const showNotionSignIn = publicConfig.data?.notionSignIn ?? false;

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
          {showNotionSignIn ? (
            <>
              <Divider label="または" labelPosition="center" />
              <Button fullWidth onClick={signInWithNotion} size="md" variant="light">
                Notion でログイン
              </Button>
            </>
          ) : null}
        </Stack>
      </Card>
    </Center>
  );
}
