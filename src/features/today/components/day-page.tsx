import { Suspense, useEffect, useRef } from "react";
import { todayJst } from "~domain/jst";

import type { PresetId } from "~/features/catalog/types/item";
import { parsePresetId } from "~/features/catalog/types/item";
import { DayBoard, weekdayPresetId } from "~/features/today/components/day-board";
import { DayPagePending } from "~/features/today/components/day-page-pending";
import {
  useAddRow,
  useConfirmRow,
  useRemoveDay,
  useRemoveRow,
  useSetDayCondition,
  useSetDayMemo,
  useSkipRow,
  useSwitchPreset,
} from "~/features/today/hooks/day-mutations";
import { useItemsList, usePresetsList } from "~/features/today/hooks/day-queries";
import { useOpenAndLoadDay } from "~/features/today/hooks/use-open-and-load-day";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";

type DayPageProps = {
  dateJst: string;
  presetFromSearch?: DaySearch["preset"];
};

export function DayPage({ dateJst, presetFromSearch }: DayPageProps) {
  return (
    <Suspense fallback={<DayPagePending dateJst={dateJst} />}>
      <DayPageReady key={dateJst} dateJst={dateJst} presetFromSearch={presetFromSearch} />
    </Suspense>
  );
}

function DayPageReady({ dateJst, presetFromSearch }: DayPageProps) {
  const today = todayJst();
  const isToday = dateJst === today;
  const { data: day } = useOpenAndLoadDay(dateJst);
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const confirm = useConfirmRow();
  const skip = useSkipRow();
  const add = useAddRow();
  const removeRow = useRemoveRow();
  const switchPreset = useSwitchPreset();
  const setCondition = useSetDayCondition();
  const setMemo = useSetDayMemo();
  const removeDay = useRemoveDay();
  const appliedPresetRef = useRef<null | PresetId>(null);

  const defaultPresetId = weekdayPresetId(dateJst, presets);
  const selectedPresetId =
    presetFromSearch === undefined ? null : (parsePresetId(presetFromSearch) as PresetId);

  useEffect(() => {
    if (!isToday || presetFromSearch === undefined) {
      return;
    }
    const presetId = parsePresetId(presetFromSearch);
    if (appliedPresetRef.current === presetId) {
      return;
    }
    appliedPresetRef.current = presetId;
    void switchPreset.mutateAsync({ dateJst, presetId, todayJst: today });
  }, [dateJst, isToday, presetFromSearch, switchPreset, today]);

  useEffect(() => {
    if (presetFromSearch === undefined) {
      appliedPresetRef.current = defaultPresetId;
    }
  }, [defaultPresetId, presetFromSearch]);

  return (
    <DayBoard
      dateJst={dateJst}
      day={day}
      isToday={isToday}
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
      onSaveCondition={(condition) => {
        void setCondition.mutateAsync({ condition, dateJst, todayJst: today });
      }}
      onSaveMemo={(memo) => {
        void setMemo.mutateAsync({ dateJst, memo, todayJst: today });
      }}
      onSkip={(rowId) => {
        void skip.mutateAsync({ rowId });
      }}
      onSwitchPreset={(presetId) => {
        appliedPresetRef.current = presetId;
        void switchPreset.mutateAsync({ dateJst, presetId, todayJst: today });
      }}
      presets={presets}
      selectedPresetId={selectedPresetId}
    />
  );
}
