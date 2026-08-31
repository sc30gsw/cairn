import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertAvatarStorageMetadata } from "../../lib/avatarStorage";
import { ForbiddenError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export type ClaimAvatarUploadArgs = {
  claimId: Id<"avatarUploadClaims">;
  storageId: Id<"_storage">;
};

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
    const previous = await ctx.db
      .query("avatarUploads")
      .withIndex("by_owner_and_storage", (q) => q.eq("ownerId", ownerId))
      .collect();

    await ctx.db.insert("avatarUploads", { ownerId, storageId: args.storageId });

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
