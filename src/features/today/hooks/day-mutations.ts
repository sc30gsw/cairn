import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useConfirmRow() {
  return useConvexMutation(api.rows.confirm);
}

export function useSkipRow() {
  return useConvexMutation(api.rows.skip);
}

export function useAddRow() {
  return useConvexMutation(api.rows.add);
}

export function useRemoveRow() {
  return useConvexMutation(api.rows.remove);
}

export function useSwitchPreset() {
  return useConvexMutation(api.rows.switchPreset);
}

export function useSetDayCondition() {
  return useConvexMutation(api.days.setCondition);
}

export function useSetDayMemo() {
  return useConvexMutation(api.days.setMemo);
}

export function useRemoveDay() {
  return useConvexMutation(api.trash.removeDay);
}
