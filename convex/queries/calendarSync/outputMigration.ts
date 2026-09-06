import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { googleEventPayloadValidator } from "../../lib/validators";
import schema from "../../schema";
import { desiredEvent } from "../../services/calendarSync/desiredEvent";
import { getConnection, getOutputSettings } from "../../services/calendarSync/getConnection";

export const outputMigration = internalQuery({
  args: { ownerId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      generation: v.number(),
      connectionId: v.id("calendarConnections"),
      googleAccountId: v.string(),
      calendarId: v.string(),
      links: v.array(
        v.object({
          link: schema.doc("calendarSyncLinks"),
          desired: v.union(v.null(), googleEventPayloadValidator),
          googleAccountId: v.string(),
          connectionId: v.id("calendarConnections"),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const settings = await getOutputSettings(ctx, args.ownerId);
    if (
      settings?.changing !== true ||
      settings.nextConnectionId === undefined ||
      settings.nextCalendarId === undefined
    )
      return null;
    const connection = await getConnection(ctx, args.ownerId, settings.nextConnectionId);
    if (connection === null || connection.disconnecting === true) return null;
    const candidates = await ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", args.ownerId))
      .filter((q) =>
        q.or(
          q.neq(q.field("connectionId"), settings.nextConnectionId),
          q.neq(q.field("calendarId"), settings.nextCalendarId),
        ),
      )
      .take(50);
    const links = await Promise.all(
      candidates.map(async (link) => {
        const previous = await getConnection(
          ctx,
          args.ownerId,
          link.connectionId ?? settings.legacyConnectionId,
        );
        if (previous === null) return null;
        return {
          link,
          desired: await desiredEvent(ctx, args.ownerId, link.sourceKind, link.sourceId),
          googleAccountId: previous.googleAccountId,
          connectionId: previous._id,
        };
      }),
    );
    return {
      connectionId: connection._id,
      googleAccountId: connection.googleAccountId,
      calendarId: settings.nextCalendarId,
      generation: settings.generation,
      links: links.flatMap((link) => (link === null ? [] : [link])),
    };
  },
});
