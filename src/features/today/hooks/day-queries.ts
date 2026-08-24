import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

//? 項目一覧の実体は共有 hook。3 feature が読むので SSoT は src/hooks/use-items-list.ts
export { useItemsList } from "~/hooks/use-items-list";

export function usePresetsList() {
  return useSuspenseQuery(convexQuery(api.queries.presets.list.list, {}));
}

export function useTargetsWithProgress(weekStartJst: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst }),
  );
}
