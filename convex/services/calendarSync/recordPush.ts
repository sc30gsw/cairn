import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushExpectation, PushOutcome } from "../../lib/validators";
import { getConnection } from "./getConnection";
import { findLink, linkSummary } from "./syncSource";

export type RecordPushResult = "conflict" | "recorded";

//? Google への送信結果を対応表に刻む。送った内容（payloadKey）と Google 側の updated を覚え、
//? アプリ側の未送信マークを消す。楽観ロック: 計画を立てたときの対応表と今の対応表が違えば
//? （別の送信が先に走った）書かずに conflict を返し、呼び手が作ってしまった予定を片付ける
export async function recordPush(
  ctx: MutationCtx,
  args: {
    calendarId: string;
    expected: PushExpectation;
    outcome: PushOutcome;
    ownerId: string;
    sourceId: string;
    sourceKind: CalendarSyncSourceKind;
  },
): Promise<RecordPushResult> {
  //? 解除と並走したときに幽霊の対応表を残さない
  if ((await getConnection(ctx, args.ownerId)) === null) {
    return "conflict";
  }
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  if (!matchesExpectation(linkSummary(link), args.expected)) {
    return "conflict";
  }
  const { outcome } = args;
  if (outcome.kind === "deleted") {
    if (link !== null) {
      await ctx.db.delete("calendarSyncLinks", link._id);
    }
    return "recorded";
  }
  //? 対応表より先に取り込みが走って、自分の予定が外部予定として写っていたら消す
  const shadow = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", args.ownerId)
        .eq("calendarId", args.calendarId)
        .eq("googleEventId", outcome.googleEventId),
    )
    .unique();
  if (shadow !== null) {
    await ctx.db.delete("externalCalendarEvents", shadow._id);
  }
  const fields = {
    appChangedAt: undefined,
    calendarId: args.calendarId,
    googleEventId: outcome.googleEventId,
    googleUpdated: outcome.googleUpdated,
    payloadKey: outcome.payloadKey,
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
    return "recorded";
  }
  await ctx.db.patch("calendarSyncLinks", link._id, fields);
  return "recorded";
}

function matchesExpectation(
  current: ReturnType<typeof linkSummary>,
  expected: PushExpectation,
): boolean {
  if (current === null || expected === null) {
    return current === expected;
  }
  return (
    current.googleEventId === expected.googleEventId &&
    current.payloadKey === expected.payloadKey &&
    current.appChangedAt === expected.appChangedAt
  );
}
