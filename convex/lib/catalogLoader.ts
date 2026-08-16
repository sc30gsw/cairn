import { indexBy, prop } from "remeda";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function toIdMap<TTable extends "categories" | "items">(
  record: Record<string, Doc<TTable>>,
): Map<Id<TTable>, Doc<TTable>> {
  return new Map(Object.entries(record) as [Id<TTable>, Doc<TTable>][]);
}

export async function loadCatalog(ctx: QueryCtx | MutationCtx, ownerId: string) {
  const [items, categories] = await Promise.all([
    ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  return {
    categoryById: toIdMap<"categories">(indexBy(categories, prop("_id"))),
    itemById: toIdMap<"items">(indexBy(items, prop("_id"))),
  };
}
