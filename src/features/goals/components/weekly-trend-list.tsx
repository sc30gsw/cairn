import { Badge, Group, Stack, Text } from "@mantine/core";

import { recordedWeeks, shortDateLabel } from "~/features/goals/lib/weekly-trend-format";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

function trendBadge(week: WeeklyTrendWeeks[number]) {
  if (week.goalMinutes === null) {
    return { color: "gray", label: "ゴールなし" } as const;
  }
  return week.achieved
    ? ({ color: "blue", label: "達成" } as const)
    : ({ color: "red", label: "未達" } as const);
}

export function WeeklyTrendList({ weeks }: Record<"weeks", WeeklyTrendWeeks>) {
  const recorded = recordedWeeks(weeks);

  if (recorded.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        過去の週の実績はまだありません。
      </Text>
    );
  }

  return (
    <Stack gap={6}>
      {recorded.map((week) => {
        const badge = trendBadge(week);
        return (
          <Group gap="xs" justify="space-between" key={week.weekStart} wrap="nowrap">
            <Text size="sm">
              {shortDateLabel(week.weekStart)}〜{shortDateLabel(week.weekEnd)}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm">
                {week.volumeMinutes}分{week.goalMinutes === null ? "" : ` / ${week.goalMinutes}分`}
              </Text>
              <Badge color={badge.color} variant="light">
                {badge.label}
              </Badge>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
