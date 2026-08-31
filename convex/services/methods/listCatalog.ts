import type { QueryCtx } from "../../_generated/server";
import type { MethodCatalogDto } from "../../lib/validators";

export async function listCatalog(ctx: QueryCtx, ownerId: string): Promise<MethodCatalogDto> {
  const [lanes, methods] = await Promise.all([
    ctx.db
      .query("methodLanes")
      .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("methods")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);

  return {
    lanes: lanes.map((lane) => ({
      _id: lane._id,
      name: lane.name,
      sortOrder: lane.sortOrder,
    })),
    methods: methods
      .map((method) => ({
        _id: method._id,
        bodyText: method.bodyText,
        completionHtml: method.completionHtml,
        laneId: method.laneId,
        memoHtml: method.memoHtml,
        name: method.name,
        nowViewing: method.nowViewing,
        sortOrder: method.sortOrder,
      }))
      .toSorted((left, right) => left.sortOrder - right.sortOrder),
  };
}
