import type { MutationCtx } from "../../_generated/server";

export const AVATAR_UPLOAD_CLAIM_TTL_MS = 60 * 60 * 1000;
export const AVATAR_UPLOAD_CLAIM_PURGE_BATCH = 200;

export async function purgeExpiredAvatarClaims(
  ctx: MutationCtx,
  args: { now?: number } = {},
): Promise<null> {
  const cutoff = (args.now ?? Date.now()) - AVATAR_UPLOAD_CLAIM_TTL_MS;
  const oldest = await ctx.db.query("avatarUploadClaims").take(AVATAR_UPLOAD_CLAIM_PURGE_BATCH);
  const expired = oldest.filter((doc) => doc._creationTime < cutoff);
  await Promise.all(expired.map((doc) => ctx.db.delete("avatarUploadClaims", doc._id)));

  return null;
}
