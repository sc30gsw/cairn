import { Badge, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { ConditionBadge } from "~/components/condition-badge";
import { MemoDayRow } from "~/features/history/components/analysis/memo-day-row";
import { groupMemosByCondition } from "~/features/history/lib/scope-days";
import type { HeatmapDay } from "~/features/history/types/history";

type MemosByConditionProps = {
  days: readonly HeatmapDay[];
};

function GroupHeading({ condition }: { condition: HeatmapDay["condition"] }) {
  if (condition === null) {
    return (
      <GroupHeadingRow>
        <Badge color="gray" variant="light">
          コンディション未設定
        </Badge>
      </GroupHeadingRow>
    );
  }

  return (
    <GroupHeadingRow>
      <ConditionBadge condition={condition} size="md" />
    </GroupHeadingRow>
  );
}

function GroupHeadingRow({ children }: { children: ReactNode }) {
  return (
    <Title order={5} mt="xs">
      {children}
    </Title>
  );
}

export function MemosByCondition({ days }: MemosByConditionProps) {
  const groups = groupMemosByCondition(days);

  if (groups.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        この範囲にメモはありません。
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {groups.map((group) => (
        <Stack gap="sm" key={group.condition ?? "memo-only"}>
          <GroupHeading condition={group.condition} />
          {group.days.map((day) => (
            <MemoDayRow day={day} key={day.dateJst} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
