import type { QueryCtx } from "../../_generated/server";
import type { CalendarFeedStatusDto } from "../../lib/validators";
import { getOwnerToken } from "./getOwnerToken";

export async function status(ctx: QueryCtx, ownerId: string): Promise<CalendarFeedStatusDto> {
  const row = await getOwnerToken(ctx, ownerId);
  return { token: row === null ? null : row.token };
}
