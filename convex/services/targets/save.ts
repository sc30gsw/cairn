import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  TARGET_DAYS_MESSAGE,
  TARGET_VALUE_LIMITS,
  TARGET_VALUE_MESSAGE,
  type TargetMetric,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "../items/helpers";

export type SaveTargetArgs = {
  categoryId: Id<"categories">;
  metric: TargetMetric;
  targetValue: number;
};

export async function save(
  ctx: MutationCtx,
  ownerId: string,
  args: SaveTargetArgs,
): Promise<Id<"targets">> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  if (!Number.isInteger(args.targetValue) || args.targetValue < TARGET_VALUE_LIMITS.min) {
    throwDomain(new ValidationFailedError({ message: TARGET_VALUE_MESSAGE }));
  }
  if (args.metric === "days" && args.targetValue > TARGET_VALUE_LIMITS.maxDays) {
    throwDomain(new ValidationFailedError({ message: TARGET_DAYS_MESSAGE }));
  }
  const existing = await ctx.db
    .query("targets")
    .withIndex("by_owner_and_category", (q) =>
      q.eq("ownerId", ownerId).eq("categoryId", args.categoryId),
    )
    .unique();
  if (existing === null) {
    return await ctx.db.insert("targets", {
      categoryId: args.categoryId,
      metric: args.metric,
      ownerId,
      targetValue: args.targetValue,
    });
  }
  await ctx.db.patch("targets", existing._id, {
    metric: args.metric,
    targetValue: args.targetValue,
  });
  return existing._id;
}
