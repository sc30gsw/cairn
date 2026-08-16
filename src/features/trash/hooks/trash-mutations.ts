import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useRestoreDay() {
  return useConvexMutation(api.mutations.trash.restoreDay.restoreDay);
}

export function useRestoreRow() {
  return useConvexMutation(api.mutations.rows.restore.restore);
}

export function usePurgeDay() {
  return useConvexMutation(api.mutations.trash.purgeDay.purgeDay);
}

export function usePurgeRow() {
  return useConvexMutation(api.mutations.trash.purgeRow.purgeRow);
}
