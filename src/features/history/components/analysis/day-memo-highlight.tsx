import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";

import { ConditionBadge } from "~/components/condition-badge";
import { formatMemoDate } from "~/features/history/components/analysis/memo-day-row";
import type { HeatmapDay } from "~/features/history/types/history";

type DayMemoHighlightProps = {
  day: HeatmapDay | undefined;
  dateJst: string;
};

export function DayMemoHighlight({ day, dateJst }: DayMemoHighlightProps) {
  const memo = day?.memo ?? null;
  const condition = day?.condition ?? null;
  const minutes = day?.minutes ?? 0;
  const hasMemo = memo !== null && memo.length > 0;

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs" wrap="wrap">
          <Title order={4}>{formatMemoDate(dateJst)}</Title>
          {condition === null ? null : <ConditionBadge condition={condition} size="md" />}
          {minutes > 0 ? (
            <Badge color="blue" variant="light">
              確定 {minutes}分
            </Badge>
          ) : null}
        </Group>
        {hasMemo ? (
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {memo}
          </Text>
        ) : (
          <Text c="dimmed" size="sm">
            この日のメモはありません。
          </Text>
        )}
      </Stack>
    </Card>
  );
}
