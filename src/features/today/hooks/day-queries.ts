import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

//? 項目一覧の実体は共有 hook。3 feature が読むので SSoT は src/hooks/use-items-list.ts
export { itemsListQuery } from "~/hooks/use-items-list";

//? 並列取得(useSuspenseQueries)側もこのファクトリを使う。
export function presetsListQuery() {
  return convexQuery(api.queries.presets.list.list, {});
}

export function usePresetsList() {
  return useSuspenseQuery(presetsListQuery());
}
