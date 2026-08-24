import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { applyMasteryProgressDelta } from "./applyMasteryProgressDelta";
import { loadDayItemTotals } from "./loadDayItemTotals";

//* 確定実績を動かしうる書き込みは、必ずこれで包む(CVX-15 / ADR-0007)。
//? 差分は書き込みの「後 − 前」を実測して出す。書き込み側が想定した増減と実際の効果が食い違っても
//? (同じ暦日に日ドキュメントが複数ある、など)カウンタは実測とずれない。
//? 測る単位は「その暦日の項目別確定合計」。目標ごとに対象項目で部分和を取れる形にしておく(#53)。
export async function withMasteryProgressDelta<T>(
  ctx: MutationCtx,
  ownerId: string,
  { dateJst }: Pick<Doc<"rows">, "dateJst">,
  write: () => Promise<T>,
): Promise<T> {
  const before = await loadDayItemTotals(ctx, ownerId, dateJst);
  //? 3つの await の順序がこの関数の意味そのもの。並列化すると「前」「後」が測れない。
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await
  const result = await write();
  const after = await loadDayItemTotals(ctx, ownerId, dateJst);
  await applyMasteryProgressDelta(ctx, ownerId, { after, before, dateJst });
  return result;
}
