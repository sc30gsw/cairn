import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { applyMasteryProgressDelta } from "./applyMasteryProgressDelta";
import { loadDayItemTotals } from "./loadDayItemTotals";

export async function withMasteryProgressDelta<T>(
  ctx: MutationCtx,
  ownerId: string,
  { dateJst }: Pick<Doc<"rows">, "dateJst">,
  write: () => Promise<T>,
): Promise<T> {
  const before = await loadDayItemTotals(ctx, ownerId, dateJst);
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await
  const result = await write();
  const after = await loadDayItemTotals(ctx, ownerId, dateJst);
  await applyMasteryProgressDelta(ctx, ownerId, { after, before, dateJst });
  return result;
}
