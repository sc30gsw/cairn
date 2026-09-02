import type { MutationCtx } from "../../_generated/server";
import { generateCalendarFeedToken } from "../../lib/calendarFeedToken";
import { getOwnerToken } from "./getOwnerToken";

//? 発行と再発行は同じ操作。古いトークンは同じトランザクションで消え、以後 404
export async function issue(ctx: MutationCtx, ownerId: string): Promise<string> {
  const token = generateCalendarFeedToken();
  const existing = await getOwnerToken(ctx, ownerId);
  if (existing === null) {
    await ctx.db.insert("calendarFeedTokens", { ownerId, token });
  } else {
    await ctx.db.patch("calendarFeedTokens", existing._id, { token });
  }
  return token;
}
