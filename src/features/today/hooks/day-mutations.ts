import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useConfirmRow() {
  return useConvexMutation(api.mutations.rows.confirm.confirm);
}

export function useSkipRow() {
  return useConvexMutation(api.mutations.rows.skip.skip);
}

export function useAddRow() {
  return useConvexMutation(api.mutations.rows.add.add);
}

export function useRemoveRow() {
  return useConvexMutation(api.mutations.rows.remove.remove);
}

export function useCopyYesterdayConfirmed() {
  return useConvexMutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed);
}

export function useSwitchPreset() {
  return useConvexMutation(api.mutations.rows.switchPreset.switchPreset);
}

export function useSetDayCondition() {
  return useConvexMutation(api.mutations.days.setCondition.setCondition);
}

export function useSetDayMemo() {
  return useConvexMutation(api.mutations.days.setMemo.setMemo);
}

export function useRemoveDay() {
  return useConvexMutation(api.mutations.trash.removeDay.removeDay);
}
