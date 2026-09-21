import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { eventsOnDate } from "./events";

export async function pendingPlanMaterializations(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"planEvents">[]> {
  const events = await eventsOnDate(ctx, ownerId, dateJst);
  const candidates = events.filter(
    (event) => event.record.kind === "item" && event.record.materializedRowId === undefined,
  );
  const pending = await Promise.all(
    candidates.map(async (event) => {
      if (event.record.kind !== "item") {
        return null;
      }
      const item = await ctx.db.get("items", event.record.itemId);
      if (item === null || item.ownerId !== ownerId) {
        return null;
      }
      return event;
    }),
  );
  return pending.filter((event) => event !== null);
}

export async function materializePlanEvents(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; day: Doc<"days"> },
): Promise<void> {
  const pending = await pendingPlanMaterializations(ctx, ownerId, args.dateJst);
  if (pending.length === 0) {
    return;
  }
  const liveRows = await liveRowsForDay(ctx, args.day._id);
  const sortStart = liveRows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  await Promise.all(
    pending.map(async (event, index) => {
      if (event.record.kind !== "item") {
        return;
      }
      const rowId = await ctx.db.insert("rows", {
        content: "",
        dateJst: args.dateJst,
        dayId: args.day._id,
        itemId: event.record.itemId,
        minutes: 0,
        ownerId,
        sortOrder: sortStart + index,
        status: "未着手",
      });
      await ctx.db.patch("planEvents", event._id, {
        record: {
          itemId: event.record.itemId,
          kind: "item",
          materializedRowId: rowId,
        },
      });
    }),
  );
}
