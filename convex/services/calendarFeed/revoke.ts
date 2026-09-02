import type { MutationCtx } from "../../_generated/server";
import { getOwnerToken } from "./getOwnerToken";

export async function revoke(ctx: MutationCtx, ownerId: string): Promise<null> {
  const existing = await getOwnerToken(ctx, ownerId);
  if (existing !== null) {
    await ctx.db.delete("calendarFeedTokens", existing._id);
  }
  return null;
}
