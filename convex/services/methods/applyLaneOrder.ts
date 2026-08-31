import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { applyLaneOrderToList, validateLaneOrder } from "../../lib/methodOrder";
import { throwDomain } from "../../lib/ownerFunctions";

export async function applyLaneOrder(
  ctx: MutationCtx,
  ownerId: string,
  args: { orderedLaneIds: Id<"methodLanes">[] },
): Promise<null> {
  const lanes = await ctx.db
    .query("methodLanes")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();

  const validationError = validateLaneOrder(lanes, args.orderedLaneIds);
  if (validationError !== null) {
    throwDomain(new ValidationFailedError({ message: validationError }));
  }

  const next = applyLaneOrderToList(
    lanes.map((lane) => ({ _id: lane._id, name: lane.name, sortOrder: lane.sortOrder })),
    args.orderedLaneIds,
  );
  const nextById = new Map(next.map((lane) => [lane._id, lane]));

  await Promise.all(
    lanes.flatMap((lane) => {
      const target = nextById.get(lane._id);
      if (target === undefined || lane.sortOrder === target.sortOrder) {
        return [];
      }
      return [ctx.db.patch("methodLanes", lane._id, { sortOrder: target.sortOrder })];
    }),
  );
  return null;
}
