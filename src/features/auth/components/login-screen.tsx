import { Button, Card, Center, Divider, Stack, Text, Title } from "@mantine/core";

import { AccountAuthPanel } from "~/features/auth/components/account-auth-form";
import { DISPLAY_FONT } from "~/lib/theme";

type LoginScreenProps = {
  onNotionSignIn: () => void;
  showNotionSignIn: boolean;
};

export function LoginScreen({ onNotionSignIn, showNotionSignIn }: LoginScreenProps) {
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
              <Button fullWidth onClick={onNotionSignIn} size="md" variant="light">
                Notion でログイン
              </Button>
            </>
          ) : null}
        </Stack>
      </Card>
    </Center>
  );
}
