import type { MutationCtx } from "../../_generated/server";

export const AVATAR_UPLOAD_CLAIM_TTL_MS = 60 * 60 * 1000;
//? claim の TTL は1時間で滞留は少ないはずだが、notifications の purgeExpired と同じ形で上限を切る(CVX-11)。
export const AVATAR_UPLOAD_CLAIM_PURGE_BATCH = 200;

export async function purgeExpiredAvatarClaims(
  ctx: MutationCtx,
  args: { now?: number } = {},
): Promise<null> {
  const cutoff = (args.now ?? Date.now()) - AVATAR_UPLOAD_CLAIM_TTL_MS;
  //? 素のテーブルスキャンは組み込みの by_creation_time 昇順(= 最古から)なので、
  //? .take で上限を切れば「古い順に最大200件」を読める(CVX-11 の許容手段)。
  //? .filter は書かない(CVX-10)。cutoff の判定は TypeScript 側で行う。
  const oldest = await ctx.db.query("avatarUploadClaims").take(AVATAR_UPLOAD_CLAIM_PURGE_BATCH);
  const expired = oldest.filter((doc) => doc._creationTime < cutoff);
  await Promise.all(expired.map((doc) => ctx.db.delete("avatarUploadClaims", doc._id)));

  return null;
}
