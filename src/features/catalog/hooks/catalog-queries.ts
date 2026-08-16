import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useCategoriesList() {
  return useSuspenseQuery(convexQuery(api.categories.list, {}));
}

export function useItemsList() {
  return useSuspenseQuery(convexQuery(api.items.list, {}));
}

export function usePresetsList() {
  return useSuspenseQuery(convexQuery(api.presets.list, {}));
}
