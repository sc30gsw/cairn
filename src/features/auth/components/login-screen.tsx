import { Button, Card, Center, Stack, Text, Title } from "@mantine/core";

import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen({ onSignIn }: Record<"onSignIn", () => void>) {
  return (
    <Center h="100dvh">
      <Card maw={420} padding="xl" shadow="sm">
        <Stack gap="md">
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            紙の記録
          </Text>
          <Title ff={DISPLAY_FONT} fw={500} order={1}>
            学習ログ
          </Title>
          <Text>所有者の Notion アカウントで入る。記録はアプリが正本です。</Text>
          <Button fullWidth onClick={onSignIn} size="md">
            Notion でログイン
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
