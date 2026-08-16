import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: { name: string },
): Promise<Id<"categories">> {
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "カテゴリ名は必須です" }));
  }
  const duplicate = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId).eq("name", name))
    .unique();
  if (duplicate !== null) {
    throwDomain(new ConflictError({ message: "同じ名前のカテゴリがあります" }));
  }
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  const last = existing[existing.length - 1];
  return await ctx.db.insert("categories", {
    name,
    ownerId,
    sortOrder: last === undefined ? 0 : last.sortOrder + 1,
  });
}
