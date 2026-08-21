import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function usePresetsList() {
  return useSuspenseQuery(convexQuery(api.queries.presets.list.list, {}));
}

export function useItemsList() {
  return useSuspenseQuery(convexQuery(api.queries.items.list.list, {}));
}

export function useTargetsWithProgress(weekStartJst: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst }),
  );
}
