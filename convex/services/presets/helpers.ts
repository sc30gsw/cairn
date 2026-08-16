import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function assertOwnedLines(
  ctx: MutationCtx,
  ownerId: string,
  lines: { itemId: Id<"items"> }[],
) {
  await Promise.all(
    lines.map(async (line) => {
      const item = await ctx.db.get("items", line.itemId);
      if (item === null || item.ownerId !== ownerId) {
        throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
      }
    }),
  );
}

export async function assertWeekdayFree(
  ctx: MutationCtx,
  ownerId: string,
  weekday: number,
  ignoreId?: Id<"presets">,
) {
  const existing = await ctx.db
    .query("presets")
    .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId).eq("weekday", weekday))
    .unique();
  if (existing !== null && existing._id !== ignoreId) {
    throwDomain(new ConflictError({ message: "各曜日はプリセット1つだけです" }));
  }
}
