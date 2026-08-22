import type { MutationCtx } from "../../_generated/server";

export const AVATAR_UPLOAD_CLAIM_TTL_MS = 60 * 60 * 1000;

export async function purgeExpiredAvatarClaims(
  ctx: MutationCtx,
  args: { now?: number } = {},
): Promise<null> {
  const cutoff = (args.now ?? Date.now()) - AVATAR_UPLOAD_CLAIM_TTL_MS;
  const claims = await ctx.db.query("avatarUploadClaims").collect();

  const expiredIds: Array<(typeof claims)[number]["_id"]> = [];
  for (const claim of claims) {
    if (claim._creationTime < cutoff) {
      expiredIds.push(claim._id);
    }
  }
  await Promise.all(expiredIds.map((id) => ctx.db.delete(id)));

  return null;
}
