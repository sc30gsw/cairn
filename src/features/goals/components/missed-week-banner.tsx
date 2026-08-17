import { Alert, Button, Stack, Text } from "@mantine/core";

import { qualifyingDaysLabel } from "~/features/goals/lib/weekly-trend-format";
import type { WeeklyTrendWeek } from "~/features/goals/types/goal";

type MissedWeekBannerProps = {
  hasObstacles: boolean;
  lastWeek: WeeklyTrendWeek;
  onShowObstacles: () => void;
};

//? 未達の提示は受動的な導線に留める。記録やコンディションを自動では変えない(CONTEXT.md 障害プラン)
export function MissedWeekBanner({
  hasObstacles,
  lastWeek,
  onShowObstacles,
}: MissedWeekBannerProps) {
  return (
    <Alert color="yellow" title="先週は週間ゴール未達でした" variant="light">
      <Stack align="flex-start" gap="xs">
        <Text size="sm">
          先週は{qualifyingDaysLabel(lastWeek)}
          でした。つまずきに備えるなら、障害プランを見直せます。
        </Text>
        <Button color="yellow" onClick={onShowObstacles} size="xs" type="button">
          {hasObstacles ? "障害プランを見る" : "障害プランを作成する"}
        </Button>
      </Stack>
    </Alert>
  );
}
