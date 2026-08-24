import type { MutationCtx } from "../../_generated/server";

//* 所有者の未読を全件既読にする。通知欄は最新50件しか返さないので、id 配列方式では
//? 画面に無い未読が既読にならずバッジが下がらない。この不整合を構造的に消すための別 mutation。
export async function markAllRead(
  ctx: MutationCtx,
  ownerId: string,
  args: { now?: number } = {},
): Promise<null> {
  const readAt = args.now ?? Date.now();
  const all = await ctx.db
    .query("notifications")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  await Promise.all(
    all.map(async (doc) => {
      if (doc.readAt === undefined) {
        await ctx.db.patch("notifications", doc._id, { readAt });
      }
    }),
  );
  return null;
}
