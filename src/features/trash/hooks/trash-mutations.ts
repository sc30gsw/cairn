import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useRestoreDay() {
  return useConvexMutation(api.trash.restoreDay);
}

export function useRestoreRow() {
  return useConvexMutation(api.rows.restore);
}

export function usePurgeDay() {
  return useConvexMutation(api.trash.purgeDay);
}

export function usePurgeRow() {
  return useConvexMutation(api.trash.purgeRow);
}
