import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export { useItemsList } from "~/hooks/use-items-list";

export function usePresetsList() {
  return useSuspenseQuery(convexQuery(api.queries.presets.list.list, {}));
}
