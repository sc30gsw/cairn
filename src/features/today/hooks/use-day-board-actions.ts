import { Result } from "better-result";
import type { DateJst } from "~domain/jst";
import { hasTimerState, timerMinutes } from "~domain/rowTimer";

import {
  useAddRow,
  useConfirmRow,
  useCopyYesterdayConfirmed,
  useFlagReview,
  useOptimisticStopRowTimer,
  useRemoveDay,
  useRemoveRow,
  useSetDayCondition,
  useSetDayMemo,
  useSkipRow,
  useSwitchPreset,
  useUnflagReview,
  useUnskipRow,
} from "~/features/today/hooks/day-mutations";
import type { DayRow } from "~/features/today/types/day";
import type {
  AddRowInput,
  ConfirmRowInput,
  FlagReviewInput,
  RemoveRowInput,
  SetConditionInput,
  SetMemoInput,
  SkipRowInput,
} from "~/features/today/types/mutations";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";
import type { PresetId } from "~/types/item";

type UseDayBoardActionsOptions = {
  onConfirmedCategory?: (category: string) => void;
};

export function useDayBoardActions(
  dateJst: DateJst,
  rows: readonly Pick<DayRow, "_id" | "category" | "timer">[],
  options: UseDayBoardActionsOptions = {},
) {
  const today = useTodayJst();
  const confirm = useConfirmRow();
  const skip = useSkipRow();
  const unskip = useUnskipRow();
  const add = useAddRow();
  const removeRow = useRemoveRow();
  const setCondition = useSetDayCondition();
  const setMemo = useSetDayMemo();
  const removeDay = useRemoveDay();
  const copyYesterday = useCopyYesterdayConfirmed();
  const switchPreset = useSwitchPreset();
  const stopTimer = useOptimisticStopRowTimer(dateJst, today);
  const flagReview = useFlagReview();
  const unflagReview = useUnflagReview();

  return {
    onAddRow: (input: AddRowInput) =>
      runMutation(() => add.mutateAsync({ ...input, dateJst, todayJst: today }), {
        successMessage: "記録を追加しました",
      }),
    onConfirm: (input: ConfirmRowInput) =>
      runMutation(
        async () => {
          const row = rows.find((entry) => entry._id === input.rowId);
          const measuredMinutes =
            row !== undefined && hasTimerState(row.timer)
              ? timerMinutes(await stopTimer.mutateAsync({ rowId: input.rowId }))
              : null;
          await confirm.mutateAsync(
            measuredMinutes === null ? input : { ...input, minutes: measuredMinutes },
          );
          if (row !== undefined) {
            options.onConfirmedCategory?.(row.category);
          }
          return measuredMinutes;
        },
        {
          successMessage: (measuredMinutes) =>
            measuredMinutes === null
              ? "記録を確定しました"
              : `計測した${String(measuredMinutes)}分で確定しました`,
        },
      ),
    onFlagReview: (input: FlagReviewInput) =>
      runMutation(() => flagReview.mutateAsync({ ...input, todayJst: today }), {
        successMessage:
          input.dueJst === undefined ? "復習に回しました" : `復習に回しました（${input.dueJst}）`,
      }),
    onUnflagReview: (rowId: RemoveRowInput["rowId"]) =>
      runMutation(() => unflagReview.mutateAsync({ rowId }), {
        successMessage: "復習をやめました",
      }),
    onCopyYesterday: () =>
      runMutation(() => copyYesterday.mutateAsync({ dateJst, todayJst: today }), {
        successMessage: "昨日の確定をコピーしました",
      }),
    onRemoveDay: () =>
      runMutation(() => removeDay.mutateAsync({ dateJst }), {
        successMessage: "この日をゴミ箱へ移動しました",
      }),
    onRemoveRow: (rowId: RemoveRowInput["rowId"]) =>
      runMutation(() => removeRow.mutateAsync({ rowId }), {
        successMessage: "記録をゴミ箱へ移動しました",
      }),
    onSaveCondition: (condition: SetConditionInput) =>
      runMutation(() => setCondition.mutateAsync({ condition, dateJst, todayJst: today }), {
        successMessage: "コンディションを保存しました",
      }),
    onSaveMemo: (memo: SetMemoInput) =>
      runMutation(() => setMemo.mutateAsync({ dateJst, memo, todayJst: today }), {
        successMessage: "メモを保存しました",
      }),
    onSkip: (rowId: SkipRowInput["rowId"]) =>
      runMutation(() => skip.mutateAsync({ rowId }), {
        successMessage: "記録を見送りにしました",
      }),
    onUnskip: (rowId: SkipRowInput["rowId"]) =>
      runMutation(() => unskip.mutateAsync({ rowId }), {
        successMessage: "見送りを取り消しました",
      }),
    onSwitchPreset: async (presetId: PresetId, appliedPresetRef?: { current: PresetId | null }) => {
      const result = await runMutation(
        () => switchPreset.mutateAsync({ dateJst, presetId, todayJst: today }),
        {
          successMessage: "プリセットを切り替えました",
        },
      );
      if (Result.isOk(result) && appliedPresetRef !== undefined)
        appliedPresetRef.current = presetId;
      return result;
    },
  };
}
