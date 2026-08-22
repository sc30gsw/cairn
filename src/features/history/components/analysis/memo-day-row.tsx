import { Anchor, Card, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { ConditionBadge } from "~/components/condition-badge";
import { TruncatedText } from "~/components/truncated-text";
import { formatJstDateLabel } from "~/features/history/lib/format-jst-date";
import type { HeatmapDay } from "~/features/history/types/history";

type MemoDayRowProps = {
  day: HeatmapDay;
  lineClamp?: number;
};

export function MemoDayRow({ day, lineClamp = 3 }: MemoDayRowProps) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <Stack gap={4} miw={0}>
          <Group gap="xs" wrap="wrap">
            <Text fw={600} size="sm">
              {formatJstDateLabel(day.dateJst)}
            </Text>
            {day.condition === null ? null : <ConditionBadge condition={day.condition} />}
            <Text c="dimmed" size="sm">
              {day.minutes}分
            </Text>
          </Group>
          <TruncatedText c="dimmed" lineClamp={lineClamp} size="sm">
            {day.memo ?? ""}
          </TruncatedText>
        </Stack>
        <Anchor
          renderRoot={(props) => (
            <Link {...props} params={{ dateJst: day.dateJst }} to="/days/$dateJst" />
          )}
          size="sm"
          underline="hover"
        >
          開く
        </Anchor>
      </Group>
    </Card>
  );
}
