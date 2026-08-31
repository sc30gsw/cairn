import { Stack } from "@mantine/core";
import { useSuspenseQueries } from "@tanstack/react-query";
import { useState } from "react";
import type { DateJst } from "~domain/jst";
import { mondayOfWeek } from "~domain/jst";

import { DayBoard } from "~/features/today/components/day-board";
import { DayBoardProvider } from "~/features/today/components/day-board-context";
import { itemsListQuery, presetsListQuery } from "~/features/today/hooks/day-queries";
import { targetRemainder, targetRemainderMessage } from "~/features/today/lib/target-remainder";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

type DayBoardTabProps = {
  dateJst: DateJst;
  presetFromSearch?: DaySearch["preset"];
};

export function DayBoardTab({ dateJst, presetFromSearch }: DayBoardTabProps) {
  const today = useTodayJst();
  const { data: day } = useOpenAndLoadDay(dateJst, today);
  const [{ data: items }, { data: presets }, { data: targets }] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(itemsListQuery()),
      parallelConvexQuery(presetsListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(mondayOfWeek(today))),
    ],
  });
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
          presets,
          remainderMessage: remainder === null ? null : targetRemainderMessage(remainder),
          todayJst: today,
        }}
      >
        <DayBoard />
      </DayBoardProvider>
    </Stack>
  );
}
