import { Anchor, Card, Group, Stack } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { TruncatedText } from "~/components/truncated-text";
import { DayMemoMeta } from "~/features/history/components/analysis/day-memo-meta";
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
          <DayMemoMeta
            condition={day.condition}
            dateJst={day.dateJst}
            minutes={day.minutes}
            variant="compact"
          />
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
