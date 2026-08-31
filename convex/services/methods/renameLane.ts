import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedLane } from "./helpers";

export async function renameLane(
  ctx: MutationCtx,
  ownerId: string,
  args: { laneId: Id<"methodLanes">; name: string },
): Promise<null> {
  const lane = await requireOwnedLane(ctx, ownerId, args.laneId);
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "レーン名は必須です" }));
  }
  const lanes = await ctx.db
    .query("methodLanes")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (lanes.some((other) => other._id !== lane._id && other.name === name)) {
    throwDomain(new ConflictError({ message: "同じ名前のレーンがあります" }));
  }
  await ctx.db.patch("methodLanes", args.laneId, { name });
  return null;
}
