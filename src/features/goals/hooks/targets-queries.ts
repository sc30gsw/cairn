import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

//? 週間ターゲットは今週専用の計器。週の起点はクライアントが計算して渡す(CVX-14)
export function useTargetsWithProgress(weekStartJst: DateJst) {
  return useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst }),
  );
}
