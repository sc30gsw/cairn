import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushOutcome } from "../../lib/validators";
import { findLink } from "./syncSource";

//? Google への送信結果を対応表に刻む。送った内容（payloadKey）と Google 側の updated を覚え、
//? アプリ側の未送信マークを消す
export async function recordPush(
  ctx: MutationCtx,
  args: {
    calendarId: string;
    outcome: PushOutcome;
    ownerId: string;
    sourceId: string;
    sourceKind: CalendarSyncSourceKind;
  },
): Promise<null> {
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  if (args.outcome.kind === "deleted") {
    if (link !== null) {
      await ctx.db.delete("calendarSyncLinks", link._id);
    }
    return null;
  }
  const fields = {
    appChangedAt: undefined,
    calendarId: args.calendarId,
    googleEventId: args.outcome.googleEventId,
    googleUpdated: args.outcome.googleUpdated,
    payloadKey: args.outcome.payloadKey,
  };
  if (link === null) {
    await ctx.db.insert("calendarSyncLinks", {
      calendarId: fields.calendarId,
      googleEventId: fields.googleEventId,
      googleUpdated: fields.googleUpdated,
      ownerId: args.ownerId,
      payloadKey: fields.payloadKey,
      sourceId: args.sourceId,
      sourceKind: args.sourceKind,
    });
    return null;
  }
  await ctx.db.patch("calendarSyncLinks", link._id, fields);
  return null;
}
