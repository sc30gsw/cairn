import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import { requireDateJst } from "../../lib/dateArgs";
import { SEARCH_RESULT_LIMIT } from "../../lib/domain";
import { compareDateJst } from "../../lib/jst";
import { formatMinuteOfDay } from "../../lib/planEvent";
import { matchesSearchText, requireSearchQuery } from "../../lib/searchText";
import type { HistorySearchDto, HistorySearchHitDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "./liveRows";

export type SearchArgs = {
  fromJst?: string;
  query: string;
};

type RankedHit = HistorySearchHitDto & Record<"sortOrder", number>;

const KIND_ORDER = {
  event: 2,
  goal: 5,
  hitokoto: 1,
  item: 3,
  memo: 0,
  method: 6,
  obstacle: 7,
  plan: 4,
} as const satisfies Record<HistorySearchHitDto["kind"], number>;

function byDateDescThenOrder(left: RankedHit, right: RankedHit): number {
  const leftDated = left.dateJst !== undefined;
  const rightDated = right.dateJst !== undefined;
  if (leftDated !== rightDated) {
    return leftDated ? -1 : 1;
  }
  if (left.dateJst !== undefined && right.dateJst !== undefined) {
    const byDate = compareDateJst(right.dateJst, left.dateJst);
    if (byDate !== 0) {
      return byDate;
    }
  }
  return KIND_ORDER[left.kind] - KIND_ORDER[right.kind] || left.sortOrder - right.sortOrder;
}

function goalSearchText(goal: Doc<"goals">): string {
  return "criterion" in goal ? `${goal.content}\n${goal.criterion}` : goal.content;
}

export async function search(
  ctx: QueryCtx,
  ownerId: string,
  args: SearchArgs,
): Promise<HistorySearchDto> {
  const normalizedQuery = requireSearchQuery(args.query);
  const fromJst = args.fromJst === undefined ? undefined : requireDateJst(args.fromJst);
  const [days, rows, catalog, templates, goals, methods, obstacles, events] = await Promise.all([
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        fromJst === undefined
          ? q.eq("ownerId", ownerId)
          : q.eq("ownerId", ownerId).gte("dateJst", fromJst),
      )
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        fromJst === undefined
          ? q.eq("ownerId", ownerId)
          : q.eq("ownerId", ownerId).gte("dateJst", fromJst),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
    ctx.db
      .query("planTemplates")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("methods")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("obstaclePlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("planEvents")
      .withIndex("by_owner_and_dateJst_and_startMinute", (q) =>
        fromJst === undefined
          ? q.eq("ownerId", ownerId)
          : q.eq("ownerId", ownerId).gte("dateJst", fromJst),
      )
      .collect(),
  ]);
  const liveDates = liveDayDatesFrom(days);
  const hits: RankedHit[] = [];
  for (const day of days) {
    if (day.deletedAt !== undefined || day.memo === undefined) {
      continue;
    }
    if (matchesSearchText(day.memo, normalizedQuery)) {
      hits.push({
        dateJst: day.dateJst,
        kind: "memo",
        sortOrder: 0,
        text: day.memo,
        title: "メモ",
      });
    }
  }
  for (const row of liveRows(rows, liveDates)) {
    if (!matchesSearchText(row.content, normalizedQuery)) {
      continue;
    }
    const item = catalog.itemById.get(row.itemId);
    const { category } = categoryFields(item, catalog.categoryById);
    hits.push({
      category,
      dateJst: row.dateJst,
      kind: "hitokoto",
      minutes: row.minutes,
      rowId: row._id,
      sortOrder: row.sortOrder,
      text: row.content,
      title: item?.name ?? "不明",
    });
  }
  for (const event of events) {
    const item =
      event.record.kind === "item" ? catalog.itemById.get(event.record.itemId) : undefined;
    const title = event.title.trim() === "" ? (item?.name ?? "予定") : event.title;
    if (!matchesSearchText(`${title}\n${item?.name ?? ""}`, normalizedQuery)) {
      continue;
    }
    hits.push({
      dateJst: event.dateJst,
      kind: "event",
      sortOrder: event.startMinute,
      text: `${formatMinuteOfDay(event.startMinute)}–${formatMinuteOfDay(event.endMinute)} ${title}`,
      title,
    });
  }
  for (const item of catalog.itemById.values()) {
    const { category } = categoryFields(item, catalog.categoryById);
    if (!matchesSearchText(`${item.name}\n${category}`, normalizedQuery)) {
      continue;
    }
    hits.push({
      category,
      kind: "item",
      sortOrder: item.sortOrder ?? 0,
      text: category,
      title: item.name,
    });
  }
  for (const [index, template] of templates.entries()) {
    if (!matchesSearchText(template.name, normalizedQuery)) {
      continue;
    }
    hits.push({
      kind: "plan",
      sortOrder: index,
      text: template.name,
      title: template.name,
    });
  }
  for (const [index, goal] of goals.entries()) {
    const text = goalSearchText(goal);
    if (!matchesSearchText(text, normalizedQuery)) {
      continue;
    }
    hits.push({
      kind: "goal",
      sortOrder: index,
      text,
      title: goal.content,
    });
  }
  for (const method of methods) {
    if (!matchesSearchText(method.name, normalizedQuery)) {
      continue;
    }
    hits.push({
      kind: "method",
      sortOrder: method.sortOrder,
      text: method.name,
      title: method.name,
    });
  }
  for (const [index, obstacle] of obstacles.entries()) {
    const text = `${obstacle.ifText}\n${obstacle.thenText}`;
    if (!matchesSearchText(text, normalizedQuery)) {
      continue;
    }
    hits.push({
      kind: "obstacle",
      sortOrder: index,
      text,
      title: obstacle.ifText,
    });
  }
  hits.sort(byDateDescThenOrder);
  return {
    hits: hits.slice(0, SEARCH_RESULT_LIMIT).map(({ sortOrder: _sortOrder, ...hit }) => hit),
    truncated: hits.length > SEARCH_RESULT_LIMIT,
  };
}
