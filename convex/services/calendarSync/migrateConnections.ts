import type { MutationCtx } from "../../_generated/server";
import { getConnection, getOutputSettings } from "./getConnection";

export async function migrateConnections(ctx: MutationCtx, ownerId: string) {
  const existing = await getOutputSettings(ctx, ownerId);
  if (existing !== null) return existing;
  const legacy = await getConnection(ctx, ownerId);
  //? 単一接続時代の接続だけが外部予定を編集できる。その Google アカウントを覚えておき、
  //? 解除して同じアカウントを再接続しても編集できる接続として扱う
  const settingsId = await ctx.db.insert("calendarOutputSettings", {
    ownerId,
    generation: 0,
    editableGoogleAccountId: legacy?.googleAccountId,
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
