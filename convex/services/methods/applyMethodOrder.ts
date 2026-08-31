import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { applyMethodOrderToList, validateLaneOrderUpdates } from "../../lib/methodOrder";
import { throwDomain } from "../../lib/ownerFunctions";
import type { ApplyMethodOrderInput } from "../../lib/validators";
import { requireOwnedLane } from "./helpers";

export async function applyMethodOrder(
  ctx: MutationCtx,
  ownerId: string,
  args: ApplyMethodOrderInput,
): Promise<null> {
  if (args.updates.length === 0) {
    return null;
  }

  const laneIds = [...new Set(args.updates.map((update) => update.laneId))];
  await Promise.all(laneIds.map((laneId) => requireOwnedLane(ctx, ownerId, laneId)));

  const seenMethodIds = new Set(args.updates.flatMap((update) => update.orderedMethodIds));
  const requestedCount = args.updates.reduce(
    (count, update) => count + update.orderedMethodIds.length,
    0,
  );
  if (seenMethodIds.size !== requestedCount) {
    throwDomain(new ValidationFailedError({ message: "方法の並べ替えが不正です" }));
  }

  const methods = await ctx.db
    .query("methods")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const methodById = new Map(methods.map((method) => [method._id, method]));
  for (const methodId of seenMethodIds) {
    if (!methodById.has(methodId)) {
      throwDomain(new ValidationFailedError({ message: "方法の並べ替えが不正です" }));
    }
  }

  const validationError = validateLaneOrderUpdates(
    methods.map((method) => ({ _id: method._id, laneId: method.laneId })),
    args.updates,
  );
  if (validationError !== null) {
    throwDomain(new ValidationFailedError({ message: validationError }));
  }

  const next = applyMethodOrderToList(
    methods.map((method) => ({
      _id: method._id,
      bodyText: method.bodyText,
      completionHtml: method.completionHtml,
      laneId: method.laneId,
      memoHtml: method.memoHtml,
      name: method.name,
      nowViewing: method.nowViewing,
      sortOrder: method.sortOrder,
    })),
    args.updates,
  );
  const nextById = new Map(next.map((method) => [method._id, method]));

  await Promise.all(
    [...seenMethodIds].map(async (methodId) => {
      const method = methodById.get(methodId);
      const target = nextById.get(methodId);
      if (method === undefined || target === undefined) {
        return;
      }
      if (method.laneId === target.laneId && method.sortOrder === target.sortOrder) {
        return;
      }
      await ctx.db.patch("methods", methodId, {
        laneId: target.laneId,
        sortOrder: target.sortOrder,
      });
    }),
  );
  return null;
}
