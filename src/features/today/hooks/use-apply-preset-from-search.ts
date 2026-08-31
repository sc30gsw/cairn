import { Result } from "better-result";
import { useEffect, useRef } from "react";
import type { DateJst } from "~domain/jst";

import { useSwitchPreset } from "~/features/today/hooks/day-mutations";
import { usePresetsList } from "~/features/today/hooks/day-queries";
import { weekdayPresetId } from "~/features/today/lib/weekday-preset";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";
import type { PresetId } from "~/types/item";
import { parsePresetId } from "~/types/item";

function presetIdFromSearch(presetFromSearch: DaySearch["preset"]): null | PresetId {
  if (presetFromSearch === undefined) {
    return null;
  }
  const parsed = parsePresetId(presetFromSearch);
  return Result.isOk(parsed) ? parsed.value : null;
}

export function useApplyPresetFromSearch(
  dateJst: DateJst,
  presetFromSearch: DaySearch["preset"],
  isToday: boolean,
) {
  const today = useTodayJst();
  const { data: presets } = usePresetsList();
  const switchPreset = useSwitchPreset();
  const appliedPresetRef = useRef<null | PresetId>(null);
  const defaultPresetId = weekdayPresetId(dateJst, presets);

  useEffect(() => {
    if (!isToday) {
      return;
    }
    const presetId = presetIdFromSearch(presetFromSearch);
    if (presetId === null || appliedPresetRef.current === presetId) {
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
    selectedPresetId: presetIdFromSearch(presetFromSearch),
    switchPreset,
  };
}
