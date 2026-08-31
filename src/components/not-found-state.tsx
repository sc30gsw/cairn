import { Button, Card, Center, EmptyState } from "@mantine/core";
import { IconMapPinOff } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

export function NotFoundState() {
  return (
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <EmptyState size="md">
          <EmptyState.Indicator>
            <IconMapPinOff aria-hidden />
          </EmptyState.Indicator>
          <EmptyState.Title order={1}>ページが見つかりません</EmptyState.Title>
          <EmptyState.Description>
            アドレスが変わったか、削除された可能性があります。
          </EmptyState.Description>
          <EmptyState.Actions>
            <Button component={Link} to="/">
              今日の記録へ戻る
            </Button>
          </EmptyState.Actions>
        </EmptyState>
      </Card>
    </Center>
  );
}
