import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { targetId: Id<"targets"> },
): Promise<null> {
  const target = await ctx.db.get("targets", args.targetId);
  if (target === null || target.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "週間ターゲットが見つかりません", resource: "週間ターゲット" }),
    );
  }
  await ctx.db.delete("targets", target._id);
  return null;
}
