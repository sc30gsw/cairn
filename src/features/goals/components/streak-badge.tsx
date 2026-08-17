import { Badge, Group } from "@mantine/core";
import { WEEKLY_TREND_WEEKS } from "~domain/domain";

import type { StreakResult } from "~/features/goals/lib/weekly-trend-streak";

//? 未達1週は「失敗」ではなく「予備を使った進捗」として見せる(Sharif & Shu 2021)
export function StreakBadge({ streak }: Record<"streak", StreakResult>) {
  if (streak.length < 2) {
    return null;
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Badge color="blue" variant="light">
        {/*? 遡れる範囲(WEEKLY_TREND_WEEKS)を使い切ったら「12週+」表記(#24) */}
        {streak.length}週{streak.length >= WEEKLY_TREND_WEEKS ? "+" : ""}連続達成中
      </Badge>
      {streak.reserveUsed && (
        <Badge color="gray" variant="light">
          予備を1回使用
        </Badge>
      )}
    </Group>
  );
}
