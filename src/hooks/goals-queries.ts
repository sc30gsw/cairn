import { convexQuery } from "@convex-dev/react-query";

import { api } from "~/../convex/_generated/api";

//? 目標/障害プランは goals と my-page が読む。features 間 import を避けてここに置く
//? (use-items-list.ts と同じ扱い)。読み出しは useSuspenseQueries での並列取得に統一しているため、
//? 公開するのはクエリファクトリだけ。
export function goalsListQuery() {
  return convexQuery(api.queries.goals.list.list, {});
}

export function obstaclesListQuery() {
  return convexQuery(api.queries.goals.listObstacles.listObstacles, {});
}
