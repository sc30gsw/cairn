import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { MasteryProgress } from "../../lib/validators";
import { loadLiveRows } from "../rows/loadLiveRows";
import { masteryProgressSince } from "./masteryProgress";

export type CountMasteryProgressArgs = {
  scopeItemIds?: readonly Id<"items">[] | undefined;
  since: string;
};

//* 目標1件ぶんのカウンタを rows から数え直す唯一の口(再計算と対象項目の変更が共有する)。
//? 上端を開いた範囲読みなので読み取り量は目標の寿命とともに増える。低頻度の操作(達成解除 / 修復 /
//? 対象項目の変更)だけが通る前提で許容する判断は ADR-0007 の追記に記録した(CVX-11)。
export async function countMasteryProgress(
  ctx: QueryCtx,
  ownerId: string,
  args: CountMasteryProgressArgs,
): Promise<MasteryProgress> {
  const { rows } = await loadLiveRows(ctx, ownerId, { from: args.since });
  return masteryProgressSince(rows, args.since, args.scopeItemIds);
}
