import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  deleteEvent,
  type GoogleCalendarClient,
  GoogleCalendarError,
  insertEvent,
  isGone,
  patchEvent,
} from "../../lib/googleCalendar";
import type { GoogleEventPayload, SyncSource } from "../../lib/validators";
import { patchPayload } from "./eventPayload";

type PushOneArgs = {
  calendarId: string;
  ownerId: string;
  source: SyncSource;
};

//? 元1件を Google に合わせる: 載せない → 消す、未登録 → 作る、内容が変わった → 置き換える。
//? 結果は対応表へ（recordPush、楽観ロック）。別の送信が先に走っていたら（conflict）、自分が作った
//? 予定は消して相手の結果に譲る。Google 側で消えていた（404 / 410）予定は作り直す
export async function pushOne(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  args: PushOneArgs,
): Promise<Result<"conflict" | "deleted" | "skipped" | "upserted", GoogleCalendarError>> {
  const { calendarId, ownerId, source } = args;
  const base = {
    calendarId,
    expected: source.link,
    ownerId,
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
  };
  if (source.desired === null) {
    if (source.link === null) {
      return Result.ok("skipped");
    }
    const deleted = await deleteEvent(client, calendarId, source.link.googleEventId);
    if (Result.isError(deleted) && !isGone(deleted.error)) {
      return deleted;
    }
    const recorded = await ctx.runMutation(internal.mutations.calendarSync.recordPush.recordPush, {
      ...base,
      outcome: { kind: "deleted" },
    });
    return Result.ok(recorded === "recorded" ? "deleted" : "conflict");
  }
  const payloadKey = source.payloadKey ?? "";
  if (
    source.link !== null &&
    source.link.payloadKey === payloadKey &&
    source.link.appChangedAt === null
  ) {
    return Result.ok("skipped");
  }
  const upserted = await upsert(
    client,
    calendarId,
    source.link?.googleEventId ?? null,
    source.desired,
  );
  if (Result.isError(upserted)) {
    return upserted;
  }
  const recorded = await ctx.runMutation(internal.mutations.calendarSync.recordPush.recordPush, {
    ...base,
    outcome: {
      googleEventId: upserted.value.id,
      googleUpdated: upserted.value.updated ?? "",
      kind: "upserted",
      payloadKey,
    },
  });
  if (recorded === "conflict") {
    //? 新しく作った予定が対応表に載らないなら孤児になるので消す（既存の予定を PATCH した場合は残す）
    if (source.link === null || source.link.googleEventId !== upserted.value.id) {
      //? 後始末は最善努力。消せなくても相手（先に記録した送信）の結果が正で、次の突き合わせで拾う
      await deleteEvent(client, calendarId, upserted.value.id);
    }
    return Result.ok("conflict");
  }
  return Result.ok("upserted");
}

async function upsert(
  client: GoogleCalendarClient,
  calendarId: string,
  googleEventId: string | null,
  desired: GoogleEventPayload,
) {
  if (googleEventId !== null) {
    const patched = await patchEvent(client, calendarId, googleEventId, patchPayload(desired));
    if (Result.isOk(patched) || !isGone(patched.error)) {
      return patched;
    }
  }
  return insertEvent(client, calendarId, desired);
}
