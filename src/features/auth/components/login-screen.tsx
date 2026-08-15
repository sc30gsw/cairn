import { Button, Card, Center, Stack, Text, Title } from "@mantine/core";

export function LoginScreen({ onSignIn }: Record<"onSignIn", () => void>) {
  return (
    <Center h={"100dvh"}>

      <Card withBorder padding="lg">
    <Stack gap="md" maw={420} mx="auto" py="xl">

      <Title order={1}>学習ログ</Title>
      <Text>所有者の Notion アカウントで入る。記録はアプリが正本です。</Text>
      <Button onClick={onSignIn}>Notion でログイン</Button>
    </Stack>
      </Card>
    </Center>
  );
}
