import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { type BoardScheduleView, scheduleListRange } from "../../lib/boardScheduleRange";
import { EXTERNAL_EVENT_NOT_FOUND_MESSAGE } from "../../lib/calendarSync";
import { requireDateJst } from "../../lib/dateArgs";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertScheduleRange, requireScheduleInstant } from "../../lib/scheduleInstant";
import type { ExternalCalendarEventDto } from "../../lib/validators";
import { getConnection } from "./getConnection";

//? 予定タブの範囲（日 / 週 / 月 / 年）に入る外部予定の写し。色はカレンダー一覧の写しから引く
export async function listExternal(
  ctx: QueryCtx,
  ownerId: string,
  args: { anchorDateJst: string; view: BoardScheduleView },
): Promise<ExternalCalendarEventDto[]> {
  const connection = await getConnection(ctx, ownerId);
  if (connection === null) {
    return [];
  }
  const anchorDateJst = requireDateJst(args.anchorDateJst);
  const { rangeEndExclusive, rangeStart } = scheduleListRange(args.view, anchorDateJst);
  const visible = new Set(connection.visibleCalendarIds);
  const calendarById = new Map(connection.calendars.map((calendar) => [calendar.id, calendar]));
  const externals = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_startAt", (q) =>
      q.eq("ownerId", ownerId).gte("startAt", rangeStart).lt("startAt", rangeEndExclusive),
    )
    .collect();
  const result: ExternalCalendarEventDto[] = [];
  for (const external of externals) {
    if (!visible.has(external.calendarId)) {
      continue;
    }
    result.push({
      _id: external._id,
      allDay: external.allDay,
      calendarId: external.calendarId,
      calendarName: calendarById.get(external.calendarId)?.summary ?? external.calendarId,
      color: calendarById.get(external.calendarId)?.backgroundColor ?? null,
      endAt: external.endAt,
      startAt: external.startAt,
      title: external.title,
    });
  }
  return result;
}

async function requireOwnedExternal(
  ctx: MutationCtx,
  ownerId: string,
  externalId: Id<"externalCalendarEvents">,
) {
  const external = await ctx.db.get("externalCalendarEvents", externalId);
  if (external === null || external.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: EXTERNAL_EVENT_NOT_FOUND_MESSAGE, resource: "外部予定" }),
    );
  }
  return external;
}

//? 写しを先に動かし、Google への反映は送信アクションに任せる（画面は即座に追従する）
export async function moveExternal(
  ctx: MutationCtx,
  ownerId: string,
  args: { endAt: string; externalId: Id<"externalCalendarEvents">; startAt: string },
): Promise<{
  allDay: boolean;
  calendarId: string;
  endAt: string;
  googleEventId: string;
  startAt: string;
}> {
  const external = await requireOwnedExternal(ctx, ownerId, args.externalId);
  const startAt = requireScheduleInstant(args.startAt);
  const endAt = requireScheduleInstant(args.endAt);
  assertScheduleRange(startAt, endAt);
  await ctx.db.patch("externalCalendarEvents", external._id, { endAt, startAt });
  return {
    allDay: external.allDay,
    calendarId: external.calendarId,
    endAt,
    googleEventId: external.googleEventId,
    startAt,
  };
}

export async function removeExternal(
  ctx: MutationCtx,
  ownerId: string,
  args: { externalId: Id<"externalCalendarEvents"> },
): Promise<{ calendarId: string; googleEventId: string }> {
  const external = await requireOwnedExternal(ctx, ownerId, args.externalId);
  await ctx.db.delete("externalCalendarEvents", external._id);
  return { calendarId: external.calendarId, googleEventId: external.googleEventId };
}
