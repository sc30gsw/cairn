import { Anchor, Card, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { ConditionBadge } from "~/components/condition-badge";
import { TruncatedText } from "~/components/truncated-text";
import type { HeatmapDay } from "~/features/history/types/history";

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

export function formatMemoDate(dateJst: string): string {
  return DATE_LABEL_FORMATTER.format(new Date(`${dateJst}T12:00:00+09:00`));
}

type MemoDayRowProps = {
  day: HeatmapDay;
  lineClamp?: number;
};

export function MemoDayRow({ day, lineClamp = 3 }: MemoDayRowProps) {
  return (
    <Card key={day.dateJst} padding="sm" radius="md" withBorder>
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <Stack gap={4} miw={0}>
          <Group gap="xs" wrap="wrap">
            <Text fw={600} size="sm">
              {formatMemoDate(day.dateJst)}
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
