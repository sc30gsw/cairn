import { Button, Card, Center, Stack, Text, Title } from "@mantine/core";

export function LoginScreen({ onSignIn }: Record<"onSignIn", () => void>) {
  return (
    <Center h="100dvh">
      <Card maw={420} padding="xl" shadow="sm" withBorder>
        <Stack gap="md">
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            紙の記録
          </Text>
          <Title ff="Newsreader, serif" fw={500} order={1}>
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
