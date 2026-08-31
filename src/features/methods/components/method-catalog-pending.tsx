import { Badge, Button, Card, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

//* Suspense fallback。suspend するコンポーネント自身は描かず、構造のモックを Shimmer が測る
//* (.claude/rules/web/shimmer-from-structure.md §2)。
export function MethodCatalogPending() {
  return (
    <Shimmer loading>
      <Card>
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>方法カタログ</Title>
            <Text c="dimmed" size="sm">
              参照専用カタログを読み込んでいます
            </Text>
          </Stack>
          <TextInput label="新しいレーン" />
          <Group align="flex-start" gap="md" wrap="nowrap">
            <Paper miw={300} p="md" radius="sm" withBorder>
              <Stack gap="sm">
                <TextInput aria-hidden />
                <Card padding="sm">
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={600} size="sm">
                      方法
                    </Text>
                    <Badge color="orange" size="sm">
                      いま見る
                    </Badge>
                  </Group>
                </Card>
                <Button size="compact-sm" variant="light">
                  追加
                </Button>
              </Stack>
            </Paper>
          </Group>
        </Stack>
      </Card>
    </Shimmer>
  );
}
