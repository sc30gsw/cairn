import { Button, Card, Center, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { DISPLAY_FONT } from "~/lib/theme";

//* 見つからないアドレスに来たときの表示。ErrorState と同じカード構成で揃える
export function NotFoundState() {
  return (
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <Stack gap="md">
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            学習ログ
          </Text>
          <Title ff={DISPLAY_FONT} fw={500} order={1}>
            ページが見つかりません
          </Title>
          <Text>アドレスが変わったか、削除された可能性があります。</Text>
          <Button component={Link} to="/">
            今日の記録へ戻る
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
