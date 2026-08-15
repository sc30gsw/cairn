import { Button, Card, Center, Grid, Text, Title } from "@mantine/core";

import { DISPLAY_FONT } from "~/lib/theme";

export function LoginScreen({ onSignIn }: Record<"onSignIn", () => void>) {
  return (
    <Center h="100dvh">
      <Card maw={420} padding="xl" shadow="sm">
        <Grid>
          <Grid.Col span={12}>
            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
              紙の記録
            </Text>
          </Grid.Col>
          <Grid.Col span={12}>
            <Title ff={DISPLAY_FONT} fw={500} order={1}>
              学習ログ
            </Title>
          </Grid.Col>
          <Grid.Col span={12}>
            <Text>所有者の Notion アカウントで入る。記録はアプリが正本です。</Text>
          </Grid.Col>
          <Grid.Col span={12}>
            <Button fullWidth onClick={onSignIn} size="md">
              Notion でログイン
            </Button>
          </Grid.Col>
        </Grid>
      </Card>
    </Center>
  );
}
