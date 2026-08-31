import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function createLane(
  ctx: MutationCtx,
  ownerId: string,
  args: { name: string },
): Promise<Id<"methodLanes">> {
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "レーン名は必須です" }));
  }
  const lanes = await ctx.db
    .query("methodLanes")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (lanes.some((lane) => lane.name === name)) {
    throwDomain(new ConflictError({ message: "同じ名前のレーンがあります" }));
  }
  const last = lanes[lanes.length - 1];
  return await ctx.db.insert("methodLanes", {
    name,
    ownerId,
    sortOrder: last === undefined ? 0 : last.sortOrder + 1,
  });
}
