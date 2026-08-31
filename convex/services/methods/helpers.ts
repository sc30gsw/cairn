import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function requireOwnedLane(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  laneId: Id<"methodLanes">,
): Promise<Doc<"methodLanes">> {
  const lane = await ctx.db.get("methodLanes", laneId);
  if (lane === null || lane.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "レーンが見つかりません", resource: "レーン" }));
  }
  return lane;
}

export async function requireOwnedMethod(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  methodId: Id<"methods">,
): Promise<Doc<"methods">> {
  const method = await ctx.db.get("methods", methodId);
  if (method === null || method.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "方法が見つかりません", resource: "方法" }));
  }
  return method;
}

export async function nextMethodSortOrder(
  ctx: MutationCtx,
  laneId: Id<"methodLanes">,
): Promise<number> {
  const methods = await ctx.db
    .query("methods")
    .withIndex("by_lane_and_sortOrder", (q) => q.eq("laneId", laneId))
    .collect();
  const last = methods[methods.length - 1];
  return last === undefined ? 0 : last.sortOrder + 1;
}
