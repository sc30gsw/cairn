import { convexQuery } from "@convex-dev/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

//? 週間ターゲットは goals / today / my-page の3 feature が読む。features 間 import を避けて
//? ここに置く(use-items-list.ts と同じ扱い)。週の起点はクライアントが計算して渡す(CVX-14)。
//? 読み出しは useSuspenseQueries での並列取得に統一しているため、公開するのはファクトリだけ。
export function targetsWithProgressQuery(weekStartJst: DateJst) {
  return convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst });
}
