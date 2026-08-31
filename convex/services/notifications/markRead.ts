import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedNotification } from "./requireOwnedNotification";

export async function markRead(
  ctx: MutationCtx,
  ownerId: string,
  args: { notificationIds: Id<"notifications">[]; now?: number },
): Promise<null> {
  const readAt = args.now ?? Date.now();
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
