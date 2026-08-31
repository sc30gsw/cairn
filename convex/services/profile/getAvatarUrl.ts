import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { ForbiddenError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export type GetAvatarUrlArgs = { storageId: Id<"_storage"> };

export async function getAvatarUrl(
  ctx: QueryCtx,
  ownerId: string,
  args: GetAvatarUrlArgs,
): Promise<string | null> {
  const upload = await ctx.db
    .query("avatarUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
    .unique();
  if (upload === null) {
    return null;
  }
  if (upload.ownerId !== ownerId) {
    throwDomain(new ForbiddenError({ message: "この画像にアクセスする権限がありません" }));
  }

  return await ctx.storage.getUrl(args.storageId);
}
