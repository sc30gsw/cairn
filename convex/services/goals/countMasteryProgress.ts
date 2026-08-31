import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { MasteryProgress } from "../../lib/validators";
import { loadLiveRows } from "../rows/loadLiveRows";
import { masteryProgressSince } from "./masteryProgress";

export type CountMasteryProgressArgs = {
  scopeItemIds?: readonly Id<"items">[] | undefined;
  since: string;
};

export async function countMasteryProgress(
  ctx: QueryCtx,
  ownerId: string,
  args: CountMasteryProgressArgs,
): Promise<MasteryProgress> {
  const { rows } = await loadLiveRows(ctx, ownerId, { from: args.since });
  return masteryProgressSince(rows, args.since, args.scopeItemIds);
}
