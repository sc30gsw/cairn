import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import type { RunningTimerDto } from "../../lib/validators";
import { findRunningTimerRow } from "./findRunningTimerRow";
import { toRowTimerDto } from "./toRowTimerDto";

export async function loadRunningTimer(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<RunningTimerDto | null> {
  const row = await findRunningTimerRow(ctx, ownerId);
  if (row === null) {
    return null;
  }
  const timer = toRowTimerDto(row);
  if (timer === null) {
    return null;
  }
  const catalog = await loadCatalog(ctx, ownerId);
  return {
    _id: row._id,
    dateJst: row.dateJst,
    itemName: catalog.itemById.get(row.itemId)?.name ?? "不明",
    timer,
  };
}
