import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function usePresetsList() {
  return useSuspenseQuery(convexQuery(api.presets.list, {}));
}

export function useItemsList() {
  return useSuspenseQuery(convexQuery(api.items.list, {}));
}
