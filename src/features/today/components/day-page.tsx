import { Suspense } from "react";
import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import type { PresetId } from "~/features/catalog/types/item";
import { DayBoard } from "~/features/today/components/day-board";
import { DayPagePending } from "~/features/today/components/day-page-pending";
import {
  useAddRow,
  useConfirmRow,
  useRemoveDay,
  useRemoveRow,
  useSetDayCondition,
  useSetDayMemo,
  useSkipRow,
} from "~/features/today/hooks/day-mutations";
import { useItemsList, usePresetsList } from "~/features/today/hooks/day-queries";
import { useApplyPresetFromSearch } from "~/features/today/hooks/use-apply-preset-from-search";
import { useOpenAndLoadDay } from "~/features/today/hooks/use-open-and-load-day";
import { datedDayRoute, indexDayRoute } from "~/features/today/lib/day-route-api";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { runMutation } from "~/lib/run-mutation";

/** `/` 専用 entry。`indexDayRoute` はこのコンポーネントからのみ使う。 */
export function TodayDayPage() {
  const dateJst = todayJst();
  const { preset } = indexDayRoute.useSearch();

  return (
    <Suspense fallback={<DayPagePending dateJst={dateJst} />}>
      <DayPageCore key={dateJst} dateJst={dateJst} presetFromSearch={preset} />
    </Suspense>
  );
}

/** `/days/$dateJst` 専用 entry。`datedDayRoute` はこのコンポーネントからのみ使う。 */
export function DatedDayPage() {
  const { dateJst } = datedDayRoute.useParams();
  const { preset } = datedDayRoute.useSearch();

  return (
    <Suspense fallback={<DayPagePending dateJst={dateJst} />}>
      <DayPageCore key={dateJst} dateJst={dateJst} presetFromSearch={preset} />
    </Suspense>
  );
}

type DayPageCoreProps = {
  dateJst: DateJst;
  presetFromSearch?: DaySearch["preset"];
};

function DayPageCore({ dateJst, presetFromSearch }: DayPageCoreProps) {
  const today = todayJst();
  const isToday = dateJst === today;
  const { data: day } = useOpenAndLoadDay(dateJst);
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const confirm = useConfirmRow();
  const skip = useSkipRow();
  const add = useAddRow();
  const removeRow = useRemoveRow();
  const setCondition = useSetDayCondition();
  const setMemo = useSetDayMemo();
  const removeDay = useRemoveDay();
  const { appliedPresetRef, selectedPresetId, switchPreset } = useApplyPresetFromSearch(
    dateJst,
    presetFromSearch,
    isToday,
  );

  return (
    <DayBoard
      dateJst={dateJst}
      day={day}
      isToday={isToday}
      items={items}
      onAddRow={(input) => {
        void runMutation(() => add.mutateAsync({ ...input, dateJst, todayJst: today }), {
          successMessage: "記録を追加しました",
        });
      }}
      onConfirm={(input) => {
        void runMutation(() => confirm.mutateAsync(input), {
          successMessage: "記録を確定しました",
        });
      }}
      onRemoveDay={() => {
        void runMutation(() => removeDay.mutateAsync({ dateJst }), {
          successMessage: "この日をゴミ箱へ移動しました",
        });
      }}
      onRemoveRow={(rowId) => {
        void runMutation(() => removeRow.mutateAsync({ rowId }), {
          successMessage: "記録をゴミ箱へ移動しました",
        });
      }}
      onSaveCondition={(condition) => {
        void runMutation(() => setCondition.mutateAsync({ condition, dateJst, todayJst: today }), {
          successMessage: "コンディションを保存しました",
        });
      }}
      onSaveMemo={(memo) => {
        void runMutation(() => setMemo.mutateAsync({ dateJst, memo, todayJst: today }), {
          successMessage: "メモを保存しました",
        });
      }}
      onSkip={(rowId) => {
        void runMutation(() => skip.mutateAsync({ rowId }), {
          successMessage: "記録を見送りにしました",
        });
      }}
      onSwitchPreset={(presetId: PresetId) => {
        appliedPresetRef.current = presetId;
        void runMutation(() => switchPreset.mutateAsync({ dateJst, presetId, todayJst: today }), {
          successMessage: "プリセットを切り替えました",
        });
      }}
      presets={presets}
      selectedPresetId={selectedPresetId}
    />
  );
}
