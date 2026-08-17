import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { TARGET_VALUE_LIMITS, type TargetMetric } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "../items/helpers";

export const TARGET_VALUE_MESSAGE = `目標値は${TARGET_VALUE_LIMITS.min}以上の整数で入力してください`;

export const TARGET_DAYS_MESSAGE = `実施日の目標は${TARGET_VALUE_LIMITS.maxDays}日までです`;

export type SaveTargetArgs = {
  categoryId: Id<"categories">;
  metric: TargetMetric;
  targetValue: number;
};

//* 1カテゴリ1件。既存があれば上書き(upsert)し、行を増やさない。
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
    return ctx.db.insert("targets", {
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
