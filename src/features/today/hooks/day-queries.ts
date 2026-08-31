import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export { itemsListQuery } from "~/hooks/use-items-list";

export function presetsListQuery() {
  return convexQuery(api.queries.presets.list.list, {});
}

export function usePresetsList() {
  return useSuspenseQuery(presetsListQuery());
}
