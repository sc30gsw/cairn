import type { MutationCtx } from "../../_generated/server";
import { getConnection, getOutputSettings } from "./getConnection";

export async function migrateConnections(ctx: MutationCtx, ownerId: string) {
  const existing = await getOutputSettings(ctx, ownerId);
  if (existing !== null) return existing;
  const legacy = await getConnection(ctx, ownerId);
  const settingsId = await ctx.db.insert("calendarOutputSettings", {
    ownerId,
    generation: 0,
    legacyConnectionId: legacy?._id,
    connectionId: legacy?._id,
    calendarId: legacy?.primaryCalendarId,
  });
  if (legacy !== null) {
    await ctx.db.patch("calendarConnections", legacy._id, {
      externalReadOnly: false,
      canWrite: true,
    });
  }
  return await ctx.db.get("calendarOutputSettings", settingsId);
}
