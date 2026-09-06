import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

type ReadCtx = MutationCtx | QueryCtx;

export async function getConnection(
  ctx: ReadCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<Doc<"calendarConnections"> | null> {
  if (connectionId !== undefined) {
    const connection = await ctx.db.get("calendarConnections", connectionId);
    return connection?.ownerId === ownerId ? connection : null;
  }
  const settings = await getOutputSettings(ctx, ownerId);
  if (settings !== null) {
    return settings.legacyConnectionId === undefined
      ? null
      : getConnection(ctx, ownerId, settings.legacyConnectionId);
  }
  const candidates = await ctx.db
    .query("calendarConnections")
    .withIndex("by_owner_and_googleAccountId", (q) => q.eq("ownerId", ownerId))
    .take(2);
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export async function getOutputSettings(ctx: ReadCtx, ownerId: string) {
  return ctx.db
    .query("calendarOutputSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}

export async function getOutput(ctx: ReadCtx, ownerId: string) {
  const settings = await getOutputSettings(ctx, ownerId);
  if (settings !== null) {
    if (settings.connectionId === undefined || settings.calendarId === undefined) return null;
    const connection = await getConnection(ctx, ownerId, settings.connectionId);
    return connection === null
      ? null
      : {
          connection,
          calendarId: settings.calendarId,
          generation: settings.generation,
          changing: settings.changing === true,
        };
  }
  const connection = await getConnection(ctx, ownerId);
  return connection === null
    ? null
    : {
        connection,
        calendarId: connection.primaryCalendarId,
        generation: 0,
        changing: false,
      };
}

export async function listConnections(
  ctx: ReadCtx,
  ownerId: string,
): Promise<Doc<"calendarConnections">[]> {
  const connections: Doc<"calendarConnections">[] = [];
  for await (const connection of ctx.db
    .query("calendarConnections")
    .withIndex("by_owner_and_googleAccountId", (q) => q.eq("ownerId", ownerId))) {
    connections.push(connection);
  }
  return connections.sort(
    (a, b) => a._creationTime - b._creationTime || a._id.localeCompare(b._id),
  );
}

export function canWriteCalendar(accessRole: string | undefined) {
  return (
    accessRole === "owner" || accessRole === "writer" || accessRole === "writerWithoutPrivateAccess"
  );
}
