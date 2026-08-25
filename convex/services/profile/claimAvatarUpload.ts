import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertAvatarStorageMetadata } from "../../lib/avatarStorage";
import { ForbiddenError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export type ClaimAvatarUploadArgs = {
  claimId: Id<"avatarUploadClaims">;
  storageId: Id<"_storage">;
};

//* アップロード済み blob を自分の avatarUploads に確定する。同じ owner の旧アバターが
//? 残っていれば置き換え、行と blob の両方を消す(消さないと _storage に孤児が溜まり続ける)。
export async function claimAvatarUpload(
  ctx: MutationCtx,
  ownerId: string,
  args: ClaimAvatarUploadArgs,
): Promise<null> {
  const claim = await ctx.db.get("avatarUploadClaims", args.claimId);
  if (claim === null || claim.ownerId !== ownerId) {
    throwDomain(new ForbiddenError({ message: "アップロードの認可が無効です" }));
  }

  const existing = await ctx.db
    .query("avatarUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
    .unique();
  if (existing !== null && existing.ownerId !== ownerId) {
    throwDomain(new ForbiddenError({ message: "この画像は別のアカウントに紐づいています" }));
  }

  const metadata = await ctx.db.system.get("_storage", args.storageId);
  assertAvatarStorageMetadata(metadata);

  if (existing === null) {
    //? by_owner_and_storage は ownerId だけの前方一致でも引ける。件数は owner 1人分なので
    //? インデックスつきの .collect は CVX-11 の許容範囲。
    const previous = await ctx.db
      .query("avatarUploads")
      .withIndex("by_owner_and_storage", (q) => q.eq("ownerId", ownerId))
      .collect();

    await ctx.db.insert("avatarUploads", { ownerId, storageId: args.storageId });

    //? 新しい storageId に置き換わった旧アバターだけ掃除する(ストレージ漏れ対策)。
    //? 各行は独立しているので Promise.all でまとめて実行する(react-doctor: async-await-in-loop)。
    const staleRows = previous.filter((row) => row.storageId !== args.storageId);
    await Promise.all(
      staleRows.flatMap((row) => [
        ctx.db.delete("avatarUploads", row._id),
        ctx.storage.delete(row.storageId),
      ]),
    );
  }

  await ctx.db.delete("avatarUploadClaims", args.claimId);

  return null;
}
