import { Card, Stack, Text } from "@mantine/core";
import type { DateJst } from "~domain/jst";

import { DayMemoMeta } from "~/features/history/components/analysis/day-memo-meta";
import type { HeatmapDay } from "~/features/history/types/history";

type DayMemoHighlightProps = {
  day: HeatmapDay | undefined;
  selectedDateJst: DateJst;
};

export function DayMemoHighlight({ day, selectedDateJst }: DayMemoHighlightProps) {
  const dateJst = day?.dateJst ?? selectedDateJst;
  const memo = day?.memo ?? null;
  const condition = day?.condition ?? null;
  const minutes = day?.minutes ?? 0;
  const hasMemo = memo !== null && memo.length > 0;

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <DayMemoMeta
          condition={condition}
          dateJst={dateJst}
          minutes={minutes}
          variant="highlight"
        />
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
