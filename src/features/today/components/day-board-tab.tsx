import { Card, Stack } from "@mantine/core";
import { useSuspenseQueries } from "@tanstack/react-query";
import { useState } from "react";
import type { DateJst } from "~domain/jst";
import { mondayOfWeek } from "~domain/jst";

import { ObstacleSection } from "~/components/obstacle-section";
import { DayBoard } from "~/features/today/components/day-board";
import { DayBoardProvider } from "~/features/today/components/day-board-context";
import { itemsListQuery } from "~/features/today/hooks/day-queries";
import { targetRemainder, targetRemainderMessage } from "~/features/today/lib/target-remainder";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { useObstaclePlans } from "~/hooks/use-obstacle-plans";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import {
  useOptionalItemsLiveQuery,
  useOptionalTargetsWithProgressLiveQuery,
} from "~/lib/tanstack-db/collections";

type DayBoardTabProps = {
  dateJst: DateJst;
  presetFromSearch?: DaySearch["preset"];
};

export function DayBoardTab({ dateJst, presetFromSearch }: DayBoardTabProps) {
  const today = useTodayJst();
  const liveItems = useOptionalItemsLiveQuery();
  const liveTargets = useOptionalTargetsWithProgressLiveQuery(mondayOfWeek(today));
  const obstaclePlans = useObstaclePlans();
  const { data: day } = useOpenAndLoadDay(dateJst, today);
  const [{ data: queriedItems }, { data: queriedTargets }] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(itemsListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(mondayOfWeek(today))),
    ],
  });
  const items = liveItems.isReady && liveItems.data !== undefined ? liveItems.data : queriedItems;
  const targets =
    liveTargets.isReady && liveTargets.data !== undefined ? liveTargets.data : queriedTargets;
  const [confirmedCategory, setConfirmedCategory] = useState<string | null>(null);

  const remainder =
    confirmedCategory === null || mondayOfWeek(dateJst) !== mondayOfWeek(today)
      ? null
      : targetRemainder(targets, confirmedCategory);

  return (
    <Stack gap="md">
      <DayBoardProvider
        value={{
          dateJst,
          day,
          items,
          onConfirmedCategory: setConfirmedCategory,
          presetFromSearch,
          presets: [],
          remainderMessage: remainder === null ? null : targetRemainderMessage(remainder),
          todayJst: today,
        }}
      >
        <DayBoard />
      </DayBoardProvider>
      <Card>
        <ObstacleSection
          obstacles={obstaclePlans.obstacles}
          onCreateObstacle={obstaclePlans.onCreateObstacle}
          onRemoveObstacle={obstaclePlans.onRemoveObstacle}
          onUpdateObstacle={obstaclePlans.onUpdateObstacle}
        />
      </Card>
    </Stack>
  );
}
