import { Stack } from "@mantine/core";
import { Suspense, useState } from "react";
import type { DateJst } from "~domain/jst";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { DayBoard } from "~/features/today/components/day-board";
import { DayPagePending } from "~/features/today/components/day-page-pending";
import { EmptyCatalogBanner } from "~/features/today/components/empty-catalog-banner";
import {
  useAddRow,
  useConfirmRow,
  useCopyYesterdayConfirmed,
  useRemoveDay,
  useRemoveRow,
  useSetDayCondition,
  useSetDayMemo,
  useSkipRow,
} from "~/features/today/hooks/day-mutations";
import {
  useItemsList,
  usePresetsList,
  useTargetsWithProgress,
} from "~/features/today/hooks/day-queries";
import { useApplyPresetFromSearch } from "~/features/today/hooks/use-apply-preset-from-search";
import { datedDayRoute, indexDayRoute } from "~/features/today/lib/day-route-api";
import { targetRemainder, targetRemainderMessage } from "~/features/today/lib/target-remainder";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";
import { runMutation } from "~/lib/run-mutation";
import type { PresetId } from "~/types/item";

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
  const { data: day } = useOpenAndLoadDay(dateJst, today);
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const { data: targets } = useTargetsWithProgress(mondayOfWeek(today));
  const [confirmedCategory, setConfirmedCategory] = useState<string | null>(null);
  const confirm = useConfirmRow();
  const skip = useSkipRow();
  const add = useAddRow();
  const removeRow = useRemoveRow();
  const setCondition = useSetDayCondition();
  const setMemo = useSetDayMemo();
  const removeDay = useRemoveDay();
  const copyYesterday = useCopyYesterdayConfirmed();
  const { appliedPresetRef, selectedPresetId, switchPreset } = useApplyPresetFromSearch(
    dateJst,
    presetFromSearch,
    isToday,
  );

  const remainder =
    confirmedCategory === null || mondayOfWeek(dateJst) !== mondayOfWeek(today)
      ? null
      : targetRemainder(targets, confirmedCategory);

  return (
    <Stack gap="md">
      {items.length === 0 ? <EmptyCatalogBanner /> : null}
      <DayBoard
        dateJst={dateJst}
        day={day}
        items={items}
        onAddRow={(input) => {
          void runMutation(() => add.mutateAsync({ ...input, dateJst, todayJst: today }), {
            successMessage: "記録を追加しました",
          });
        }}
        onConfirm={(input) => {
          const row = day.rows.find((entry) => entry._id === input.rowId);
          void runMutation(
            async () => {
              await confirm.mutateAsync(input);
              if (row !== undefined) {
                setConfirmedCategory(row.category);
              }
            },
            {
              successMessage: "記録を確定しました",
            },
          );
        }}
        onCopyYesterday={() => {
          void runMutation(() => copyYesterday.mutateAsync({ dateJst, todayJst: today }), {
            successMessage: "昨日の確定をコピーしました",
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
          void runMutation(
            () => setCondition.mutateAsync({ condition, dateJst, todayJst: today }),
            {
              successMessage: "コンディションを保存しました",
            },
          );
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
        remainderMessage={remainder === null ? null : targetRemainderMessage(remainder)}
        selectedPresetId={selectedPresetId}
        todayJst={today}
      />
    </Stack>
  );
}
