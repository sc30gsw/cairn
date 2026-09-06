import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { type BoardScheduleView, scheduleListRange } from "../../lib/boardScheduleRange";
import {
  CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
  EXTERNAL_EVENT_NOT_FOUND_MESSAGE,
} from "../../lib/calendarSync";
import { requireDateJst } from "../../lib/dateArgs";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationFailedError,
} from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertScheduleRange, requireScheduleInstant } from "../../lib/scheduleInstant";
import type { ExternalCalendarEventDto } from "../../lib/validators";
import { getConnection } from "./getConnection";

function canEditCalendar(accessRole: string | undefined): boolean {
  return (
    accessRole === "owner" || accessRole === "writer" || accessRole === "writerWithoutPrivateAccess"
  );
}

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
      q.eq("ownerId", ownerId).lt("startAt", rangeEndExclusive),
    )
    .filter((q) => q.gt(q.field("endAt"), rangeStart))
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
      calendarEmail: connection.googleEmail ?? null,
      colorId: external.colorId ?? null,
      calendarName: calendarById.get(external.calendarId)?.summary ?? external.calendarId,
      canEdit:
        connection.disconnecting !== true &&
        canEditCalendar(calendarById.get(external.calendarId)?.accessRole),
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
  const connection = await getConnection(ctx, ownerId);
  if (connection?.disconnecting === true) {
    throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
  }
  const calendar = connection?.calendars.find((entry) => entry.id === external.calendarId);
  if (!canEditCalendar(calendar?.accessRole)) {
    throwDomain(new ForbiddenError({ message: "このカレンダーの予定を変更する権限がありません" }));
  }
  return external;
}

export async function moveExternal(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    endAt: string;
    externalId: Id<"externalCalendarEvents">;
    startAt: string;
    title?: string;
    colorId?: string | null;
  },
): Promise<{
  allDay: boolean;
  title: string;
  colorId: string | null;
  calendarId: string;
  endAt: string;
  googleEventId: string;
  startAt: string;
}> {
  const external = await requireOwnedExternal(ctx, ownerId, args.externalId);
  const startAt = requireScheduleInstant(args.startAt);
  const endAt = requireScheduleInstant(args.endAt);
  assertScheduleRange(startAt, endAt);
  const title = args.title?.trim() ?? external.title;
  if (title.length === 0 || title.length > 1000) {
    throwDomain(new ValidationFailedError({ message: "件名は1〜1000文字で入力してください" }));
  }
  const colorId = args.colorId === undefined ? external.colorId : (args.colorId ?? undefined);
  await ctx.db.patch("externalCalendarEvents", external._id, { endAt, startAt, title, colorId });
  return {
    allDay: external.allDay,
    title,
    colorId: colorId ?? null,
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
