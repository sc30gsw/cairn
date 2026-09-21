import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { boardScheduleGoogleColor, type BoardScheduleColor } from "../../lib/boardScheduleColors";
import {
  PLAN_PRIORITY_STYLE,
  planWindowFromScheduleInstants,
  type PlanPriority,
} from "../../lib/planEvent";

export const BOARD_SCHEDULE_OVERNIGHT_MESSAGE = "日跨ぎの予定は移せません";

const LEGACY_BLOCK_KIND = "block";

export function planPriorityFromBoardColor(color: BoardScheduleColor | undefined): PlanPriority {
  if (color === undefined) {
    return "medium";
  }
  const id = boardScheduleGoogleColor(color).id;
  if (id === PLAN_PRIORITY_STYLE.high.googleColorId) {
    return "high";
  }
  //? Graphite（8）は低の旧色。既存のボード予定を medium に落とさない
  if (id === PLAN_PRIORITY_STYLE.low.googleColorId || id === "8") {
    return "low";
  }
  return "medium";
}

export async function migrateBoardScheduleEvent(
  ctx: MutationCtx,
  block: Doc<"boardScheduleEvents">,
): Promise<Id<"planEvents">> {
  const window = planWindowFromScheduleInstants(block.startAt, block.endAt);
  if (window === null) {
    throw new Error(`${BOARD_SCHEDULE_OVERNIGHT_MESSAGE}: ${block._id}`);
  }
  const row = await ctx.db.get("rows", block.rowId);
  const priority = planPriorityFromBoardColor(block.color);
  const planId =
    row === null
      ? await ctx.db.insert("planEvents", {
          dateJst: window.dateJst,
          endMinute: window.endMinute,
          ownerId: block.ownerId,
          priority,
          record: { kind: "none" },
          startMinute: window.startMinute,
          title: block.title,
        })
      : await ctx.db.insert("planEvents", {
          dateJst: window.dateJst,
          endMinute: window.endMinute,
          ownerId: block.ownerId,
          priority,
          record: {
            itemId: row.itemId,
            kind: "item",
            materializedRowId: row._id,
          },
          startMinute: window.startMinute,
          title: block.title,
        });
  const links = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_source", (q) =>
      q.eq("sourceKind", LEGACY_BLOCK_KIND as "plan").eq("sourceId", block._id),
    )
    .collect();
  await Promise.all(
    links.map((link) =>
      ctx.db.patch("calendarSyncLinks", link._id, {
        sourceKind: "plan",
        sourceId: planId,
      }),
    ),
  );
  return planId;
}
