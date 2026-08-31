import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { nextMethodSortOrder, requireOwnedLane } from "./helpers";

export async function createMethod(
  ctx: MutationCtx,
  ownerId: string,
  args: { laneId: Id<"methodLanes">; name: string },
): Promise<Id<"methods">> {
  await requireOwnedLane(ctx, ownerId, args.laneId);
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "方法のタイトルは必須です" }));
  }
  const sortOrder = await nextMethodSortOrder(ctx, args.laneId);
  return await ctx.db.insert("methods", {
    bodyText: "",
    completionHtml: "",
    laneId: args.laneId,
    memoHtml: "",
    name,
    nowViewing: false,
    ownerId,
    sortOrder,
  });
}
