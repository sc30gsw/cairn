import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

//* 所有権ガード(IDOR 防止、CVX-04)。requireOwnedGoal / requireOwnedRow と同じ形。
export async function requireOwnedNotification(
  ctx: MutationCtx,
  ownerId: string,
  notificationId: Id<"notifications">,
): Promise<Doc<"notifications">> {
  const notification = await ctx.db.get("notifications", notificationId);
  if (notification === null || notification.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "通知が見つかりません", resource: "通知" }));
  }
  return notification;
}
