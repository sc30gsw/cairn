import { Shimmer } from "@shimmer-from-structure/react";
import { todayJst } from "~domain/jst";

import { DayBoard } from "~/features/today/components/day-board";
import {
  dayBoardShimmerDay,
  dayBoardShimmerItems,
  dayBoardShimmerPresets,
} from "~/features/today/lib/day-board-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

type DayPagePendingProps = {
  dateJst: string;
};

export function DayPagePending({ dateJst }: DayPagePendingProps) {
  const today = todayJst();

  return (
    <Shimmer loading>
      <DayBoard
        dateJst={dateJst}
        day={dayBoardShimmerDay(dateJst)}
        isToday={dateJst === today}
        items={dayBoardShimmerItems}
        onAddRow={shimmerNoop}
        onConfirm={shimmerNoop}
        onRemoveDay={shimmerNoop}
        onRemoveRow={shimmerNoop}
        onSaveCondition={shimmerNoop}
        onSaveMemo={shimmerNoop}
        onSkip={shimmerNoop}
        onSwitchPreset={shimmerNoop}
        presets={dayBoardShimmerPresets}
        selectedPresetId={null}
      />
    </Shimmer>
  );
}
