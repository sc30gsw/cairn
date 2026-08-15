import { convexQuery } from "@convex-dev/react-query";
import { Loader } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { DayBoard } from "~/features/today/components/day-board";
import { useOpenAndLoadDay } from "~/features/today/hooks/use-open-and-load-day";
import { todayJst } from "~/lib/date-jst";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function DayPage({ dateJst }: Record<"dateJst", string>) {
  return (
    <Suspense fallback={<Loader aria-label="読み込み中" />}>
      <DayPageReady dateJst={dateJst} />
    </Suspense>
  );
}

function DayPageReady({ dateJst }: Record<"dateJst", string>) {
  const today = todayJst();
  const { data: day } = useOpenAndLoadDay(dateJst);
  const { data: items } = useSuspenseQuery(convexQuery(api.items.list, {}));
  const { data: presets } = useSuspenseQuery(convexQuery(api.presets.list, {}));
  const confirm = useConvexMutation(api.rows.confirm);
  const skip = useConvexMutation(api.rows.skip);
  const add = useConvexMutation(api.rows.add);
  const removeRow = useConvexMutation(api.rows.remove);
  const switchPreset = useConvexMutation(api.rows.switchPreset);
  const setBed = useConvexMutation(api.tonight.setBed);
  const setWake = useConvexMutation(api.days.setWake);
  const setCondition = useConvexMutation(api.days.setCondition);
  const setMemo = useConvexMutation(api.days.setMemo);
  const removeDay = useConvexMutation(api.trash.removeDay);

  return (
    <DayBoard
      dateJst={dateJst}
      day={day}
      isToday={dateJst === today}
      items={items}
      onAddRow={(input) => {
        void add.mutateAsync({ ...input, dateJst, todayJst: today });
      }}
      onConfirm={(input) => {
        void confirm.mutateAsync(input);
      }}
      onRemoveDay={() => {
        void removeDay.mutateAsync({ dateJst, now: Date.now() });
      }}
      onRemoveRow={(rowId) => {
        void removeRow.mutateAsync({ now: Date.now(), rowId });
      }}
      onSaveBed={(bedHm) => {
        void setBed.mutateAsync({ bedHm });
      }}
      onSaveCondition={(condition) => {
        void setCondition.mutateAsync({ condition, dateJst, todayJst: today });
      }}
      onSaveMemo={(memo) => {
        void setMemo.mutateAsync({ dateJst, memo, todayJst: today });
      }}
      onSaveWake={(wakeHm) => {
        void setWake.mutateAsync({ dateJst, todayJst: today, wakeHm });
      }}
      onSkip={(rowId) => {
        void skip.mutateAsync({ rowId });
      }}
      onSwitchPreset={(presetId) => {
        void switchPreset.mutateAsync({ dateJst, presetId, todayJst: today });
      }}
      presets={presets}
    />
  );
}
