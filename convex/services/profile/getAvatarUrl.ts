import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { ForbiddenError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export type GetAvatarUrlArgs = { storageId: Id<"_storage"> };

//* 未 claim / 削除済みは「ないもの」として null を返す(CVX-14 とは無関係の想定内の欠落)。
//? 他 owner の avatarUploads に紐づく storageId だけは所有権違反として大声で弾く。
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

  //? getUrl の null(blob が既に削除済み等)もまた想定内の欠落として素通しする。
  return await ctx.storage.getUrl(args.storageId);
}
