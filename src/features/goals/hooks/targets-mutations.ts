import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useSaveTarget() {
  return useConvexMutation(api.mutations.targets.save.save);
}

export function useRemoveTarget() {
  return useConvexMutation(api.mutations.targets.remove.remove);
}
