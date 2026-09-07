import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { type BoardScheduleView, scheduleListRange } from "../../lib/boardScheduleRange";
import {
  CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
  canWriteCalendar,
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
import { findAppLink } from "./findAppLink";
import { getConnection, listConnections } from "./getConnection";

type ReadCtx = MutationCtx | QueryCtx;

type EventKey = { calendarId: string; googleEventId: string };

//? 閲覧専用接続（Q3）の保護は表示中の写しではなく、所有者の全接続から再判定する。
//? 閲覧専用接続がそのカレンダーを持つ、または同じ予定の写しを持つなら、どの接続経由でも編集不可
async function canEditWith(
  ctx: ReadCtx,
  ownerId: string,
  connections: readonly Doc<"calendarConnections">[],
  connection: Doc<"calendarConnections"> | null,
  event: EventKey,
): Promise<boolean> {
  if (
    connection === null ||
    connection.disconnecting === true ||
    connection.canWrite === false ||
    !canWriteCalendar(
      connection.calendars.find((calendar) => calendar.id === event.calendarId)?.accessRole,
    )
  )
    return false;
  const readOnly = connections.filter((candidate) => candidate.externalReadOnly === true);
  if (readOnly.some((candidate) => candidate.calendars.some((c) => c.id === event.calendarId)))
    return false;
  return !(await hasReadOnlyCopy(
    ctx,
    ownerId,
    event,
    new Set(readOnly.map((candidate) => candidate._id)),
  ));
}

export async function canEditExternal(
  ctx: ReadCtx,
  ownerId: string,
  calendarId: string,
  googleEventId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<boolean> {
  const [connections, connection] = await Promise.all([
    listConnections(ctx, ownerId),
    getConnection(ctx, ownerId, connectionId),
  ]);
  return canEditWith(ctx, ownerId, connections, connection, { calendarId, googleEventId });
}

export async function listExternal(
  ctx: QueryCtx,
  ownerId: string,
  args: { anchorDateJst: string; view: BoardScheduleView },
): Promise<ExternalCalendarEventDto[]> {
  const [connections, legacy] = await Promise.all([
    listConnections(ctx, ownerId),
    getConnection(ctx, ownerId),
  ]);
  const byId = new Map(connections.map((connection) => [connection._id, connection]));
  const { rangeEndExclusive, rangeStart } = scheduleListRange(
    args.view,
    requireDateJst(args.anchorDateJst),
  );
  const chosen = new Map<
    string,
    { external: Doc<"externalCalendarEvents">; connection: Doc<"calendarConnections"> }
  >();
  for await (const external of ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_startAt", (q) =>
      q.eq("ownerId", ownerId).lt("startAt", rangeEndExclusive),
    )) {
    if (external.endAt <= rangeStart) continue;
    const connectionId = external.connectionId ?? legacy?._id;
    const connection = connectionId === undefined ? undefined : byId.get(connectionId);
    if (connection === undefined || !connection.visibleCalendarIds.includes(external.calendarId))
      continue;
    //? 同じ実カレンダーの同じ予定は接続をまたいで1件にまとめる。新しい変更を優先し、
    //? 同時刻なら _id 順で安定した取得元を選ぶ（Q8）
    const key = JSON.stringify([external.calendarId, external.googleEventId]);
    const current = chosen.get(key);
    if (
      current === undefined ||
      external.googleUpdated > current.external.googleUpdated ||
      (external.googleUpdated === current.external.googleUpdated &&
        external._id < current.external._id)
    )
      chosen.set(key, { external, connection });
  }
  const result = await Promise.all(
    [...chosen.values()].map(
      async ({ external, connection }): Promise<ExternalCalendarEventDto | null> => {
        const link = await findAppLink(ctx, ownerId, external.calendarId, external.googleEventId);
        if (link !== null) return null;
        const deleted = await ctx.db
          .query("calendarEventDeletions")
          .withIndex("by_owner_and_calendar_and_event", (q) =>
            q
              .eq("ownerId", ownerId)
              .eq("calendarId", external.calendarId)
              .eq("googleEventId", external.googleEventId),
          )
          .unique();
        if (deleted !== null && deleted.deletedAt >= external.googleUpdated) return null;
        const calendar = connection.calendars.find((entry) => entry.id === external.calendarId);
        return {
          _id: external._id,
          allDay: external.allDay,
          calendarId: external.calendarId,
          calendarEmail: connection.googleEmail ?? null,
          colorId: external.colorId ?? null,
          calendarName: calendar?.summary ?? external.calendarId,
          canEdit: await canEditWith(ctx, ownerId, connections, connection, external),
          color: calendar?.backgroundColor ?? null,
          endAt: external.endAt,
          startAt: external.startAt,
          title: external.title,
        };
      },
    ),
  );
  return result.flatMap((event) => (event === null ? [] : [event]));
}

async function requireOwnedExternal(
  ctx: MutationCtx,
  ownerId: string,
  externalId: Id<"externalCalendarEvents">,
) {
  const external = await ctx.db.get("externalCalendarEvents", externalId);
  if (external === null || external.ownerId !== ownerId)
    throwDomain(
      new NotFoundError({ message: EXTERNAL_EVENT_NOT_FOUND_MESSAGE, resource: "外部予定" }),
    );
  const [connections, connection] = await Promise.all([
    listConnections(ctx, ownerId),
    getConnection(ctx, ownerId, external.connectionId),
  ]);
  if (connection?.disconnecting === true)
    throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
  if (!(await canEditWith(ctx, ownerId, connections, connection, external)))
    throwDomain(new ForbiddenError({ message: "このカレンダーの予定を変更する権限がありません" }));
  return { ...external, connectionId: connection?._id };
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
  connectionId?: Id<"calendarConnections">;
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
    connectionId: external.connectionId,
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
): Promise<{
  connectionId?: Id<"calendarConnections">;
  calendarId: string;
  googleEventId: string;
}> {
  const external = await requireOwnedExternal(ctx, ownerId, args.externalId);
  await ctx.db.delete("externalCalendarEvents", external._id);
  return {
    connectionId: external.connectionId,
    calendarId: external.calendarId,
    googleEventId: external.googleEventId,
  };
}

async function hasReadOnlyCopy(
  ctx: ReadCtx,
  ownerId: string,
  event: EventKey,
  connectionIds: Set<Id<"calendarConnections">>,
): Promise<boolean> {
  if (connectionIds.size === 0) return false;
  for await (const copy of ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", ownerId)
        .eq("calendarId", event.calendarId)
        .eq("googleEventId", event.googleEventId),
    )) {
    if (copy.connectionId !== undefined && connectionIds.has(copy.connectionId)) return true;
  }
  return false;
}
