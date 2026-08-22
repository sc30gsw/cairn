import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import {
  useAddRow,
  useConfirmRow,
  useCopyYesterdayConfirmed,
  useRemoveDay,
  useRemoveRow,
  useSetDayCondition,
  useSetDayMemo,
  useSkipRow,
  useSwitchPreset,
} from "~/features/today/hooks/day-mutations";
import type { DayRow } from "~/features/today/types/day";
import type {
  AddRowInput,
  ConfirmRowInput,
  RemoveRowInput,
  SetConditionInput,
  SetMemoInput,
  SkipRowInput,
} from "~/features/today/types/mutations";
import { runMutation } from "~/lib/run-mutation";
import type { PresetId } from "~/types/item";

type UseDayBoardActionsOptions = {
  onConfirmedCategory?: (category: string) => void;
};

export function useDayBoardActions(
  dateJst: DateJst,
  rows: readonly Pick<DayRow, "_id" | "category">[],
  options: UseDayBoardActionsOptions = {},
) {
  const today = todayJst();
  const confirm = useConfirmRow();
  const skip = useSkipRow();
  const add = useAddRow();
  const removeRow = useRemoveRow();
  const setCondition = useSetDayCondition();
  const setMemo = useSetDayMemo();
  const removeDay = useRemoveDay();
  const copyYesterday = useCopyYesterdayConfirmed();
  const switchPreset = useSwitchPreset();

  return {
    onAddRow: (input: AddRowInput) =>
      runMutation(() => add.mutateAsync({ ...input, dateJst, todayJst: today }), {
        successMessage: "記録を追加しました",
      }).then(() => undefined),
    onConfirm: (input: ConfirmRowInput) =>
      runMutation(
        async () => {
          await confirm.mutateAsync(input);
          const row = rows.find((entry) => entry._id === input.rowId);
          if (row !== undefined) {
            options.onConfirmedCategory?.(row.category);
          }
        },
        { successMessage: "記録を確定しました" },
      ).then(() => undefined),
    onCopyYesterday: () =>
      runMutation(() => copyYesterday.mutateAsync({ dateJst, todayJst: today }), {
        successMessage: "昨日の確定をコピーしました",
      }).then(() => undefined),
    onRemoveDay: () =>
      runMutation(() => removeDay.mutateAsync({ dateJst }), {
        successMessage: "この日をゴミ箱へ移動しました",
      }).then(() => undefined),
    onRemoveRow: (rowId: RemoveRowInput["rowId"]) =>
      runMutation(() => removeRow.mutateAsync({ rowId }), {
        successMessage: "記録をゴミ箱へ移動しました",
      }).then(() => undefined),
    onSaveCondition: (condition: SetConditionInput) =>
      runMutation(() => setCondition.mutateAsync({ condition, dateJst, todayJst: today }), {
        successMessage: "コンディションを保存しました",
      }).then(() => undefined),
    onSaveMemo: (memo: SetMemoInput) =>
      runMutation(() => setMemo.mutateAsync({ dateJst, memo, todayJst: today }), {
        successMessage: "メモを保存しました",
      }).then(() => undefined),
    onSkip: (rowId: SkipRowInput["rowId"]) =>
      runMutation(() => skip.mutateAsync({ rowId }), {
        successMessage: "記録を見送りにしました",
      }).then(() => undefined),
    onSwitchPreset: (presetId: PresetId, appliedPresetRef?: { current: PresetId | null }) => {
      if (appliedPresetRef !== undefined) {
        appliedPresetRef.current = presetId;
      }
      return runMutation(() => switchPreset.mutateAsync({ dateJst, presetId, todayJst: today }), {
        successMessage: "プリセットを切り替えました",
      }).then(() => undefined);
    },
  };
}
