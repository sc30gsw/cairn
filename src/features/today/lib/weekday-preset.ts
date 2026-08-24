import { type DateJst, weekdayFromDateJst } from "~domain/jst";

import type { PresetDto } from "~/types/item";

//? day-board.tsx と use-apply-preset-from-search.ts の両方が使う純粋関数。
//? コンポーネント側に置くとフックからの import で循環参照になるため lib に切り出す
export function weekdayPresetId(dateJst: DateJst, presets: PresetDto[]) {
  return presets.find((preset) => preset.weekday === weekdayFromDateJst(dateJst))?._id ?? null;
}
