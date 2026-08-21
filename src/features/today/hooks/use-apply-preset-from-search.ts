import { useEffect, useRef } from "react";
import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import { weekdayPresetId } from "~/features/today/components/day-board";
import { useSwitchPreset } from "~/features/today/hooks/day-mutations";
import { usePresetsList } from "~/features/today/hooks/day-queries";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { runMutation } from "~/lib/run-mutation";
import type { PresetId } from "~/types/item";
import { parsePresetId } from "~/types/item";

export function useApplyPresetFromSearch(
  dateJst: DateJst,
  presetFromSearch: DaySearch["preset"],
  isToday: boolean,
) {
  const today = todayJst();
  const { data: presets } = usePresetsList();
  const switchPreset = useSwitchPreset();
  const appliedPresetRef = useRef<null | PresetId>(null);
  const defaultPresetId = weekdayPresetId(dateJst, presets);

  useEffect(() => {
    if (!isToday || presetFromSearch === undefined) {
      return;
    }
    const presetId = parsePresetId(presetFromSearch);
    if (appliedPresetRef.current === presetId) {
      return;
    }
    appliedPresetRef.current = presetId;
    void runMutation(() => switchPreset.mutateAsync({ dateJst, presetId, todayJst: today }));
  }, [dateJst, isToday, presetFromSearch, switchPreset, today]);

  useEffect(() => {
    if (presetFromSearch === undefined) {
      appliedPresetRef.current = defaultPresetId;
    }
  }, [defaultPresetId, presetFromSearch]);

  return {
    appliedPresetRef,
    defaultPresetId,
    selectedPresetId: presetFromSearch === undefined ? null : parsePresetId(presetFromSearch),
    switchPreset,
  };
}
