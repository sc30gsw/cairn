import { Badge, Group, Stack, Text } from "@mantine/core";

import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

//? "2026-08-04" → "8/4" 。週ラベルは月/日で十分読める
function shortDateLabel(dateJst: string) {
  const [, month, day] = dateJst.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function trendBadge(week: WeeklyTrendWeeks[number]) {
  if (week.goalMinutes === null) {
    return { color: "gray", label: "ゴールなし" } as const;
  }
  return week.achieved
    ? ({ color: "blue", label: "達成" } as const)
    : ({ color: "red", label: "未達" } as const);
}

export function WeeklyTrendList({ weeks }: Record<"weeks", WeeklyTrendWeeks>) {
  //? 記録もゴールもない週は表示しない(未記録の休養週で一覧を埋めない)
  const recorded = weeks.filter((week) => week.goalMinutes !== null || week.volumeMinutes > 0);

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
