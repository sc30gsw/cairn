import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";

import { ONBOARDING_CATALOG_SAMPLES } from "~/features/onboarding/constants/catalog-samples";

export function CatalogSamplesPreview() {
  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>カタログ例</Title>
        <Text c="dimmed" size="sm">
          参考用のサンプルです。自動登録はされません。自分の項目・プリセットとして登録してください。
        </Text>
        <Stack gap="sm">
          {ONBOARDING_CATALOG_SAMPLES.map((sample) => (
            <Group gap="xs" justify="space-between" key={sample.name} wrap="nowrap">
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={600} size="sm">
                    {sample.name}
                  </Text>
                  <Badge color="gray" variant="light">
                    {sample.category}
                  </Badge>
                </Group>
                <Text c="dimmed" size="xs">
                  {sample.content}（{sample.minutes}分）
                </Text>
              </Stack>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
