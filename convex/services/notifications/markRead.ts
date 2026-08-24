import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedNotification } from "./requireOwnedNotification";

//* 行クリック(1件)用。既読の行は上書きしない — 読んだ時刻は最初の1回が正。
export async function markRead(
  ctx: MutationCtx,
  ownerId: string,
  args: { notificationIds: Id<"notifications">[]; now?: number },
): Promise<null> {
  const readAt = args.now ?? Date.now();
  //? 所有権ガードを先に全件通す。1件でも他人のものがあれば patch する前に落ちる(CVX-04)。
  const notifications = await Promise.all(
    args.notificationIds.map((notificationId) =>
      requireOwnedNotification(ctx, ownerId, notificationId),
    ),
  );
  await Promise.all(
    notifications.map(async (notification) => {
      if (notification.readAt === undefined) {
        await ctx.db.patch("notifications", notification._id, { readAt });
      }
    }),
  );
  return null;
}
