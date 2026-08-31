import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedMethod } from "./helpers";

export async function removeMethod(
  ctx: MutationCtx,
  ownerId: string,
  args: { methodId: Id<"methods"> },
): Promise<null> {
  await requireOwnedMethod(ctx, ownerId, args.methodId);
  await ctx.db.delete("methods", args.methodId);
  return null;
}
