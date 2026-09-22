import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { serverTodayJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import {
  formatMinuteOfDay,
  parsePlanWindow,
  PLAN_FROZEN_MESSAGE,
  PLAN_TITLE_MESSAGE,
  planListDateRange,
  requirePlanEventDateJst,
  type PlanPriority,
  type PlanView,
} from "../../lib/planEvent";
import type { PlanEventDto, PlanEventDraft, PlanRecordStateDto } from "../../lib/validators/plan";
import { schedulePlanSync } from "../calendarSync/scheduleSourceSync";

type PlanRecord =
  | { kind: "none" }
  | { itemId: Id<"items">; kind: "item"; materializedRowId?: Id<"rows"> };

type SaveArgs = {
  dateJst: string;
  endTime: string;
  eventId?: Id<"planEvents">;
  itemId?: Id<"items">;
  priority: PlanPriority;
  sourceTemplateId?: Id<"planTemplates">;
  startTime: string;
  title: string;
  todayJst: string;
};

function isFrozen(event: Doc<"planEvents">): boolean {
  return event.record.kind === "item" && event.record.materializedRowId !== undefined;
}

function currentItemId(event: Doc<"planEvents">): Id<"items"> | undefined {
  return event.record.kind === "item" ? event.record.itemId : undefined;
}

async function requireOwnedEvent(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  eventId: Id<"planEvents">,
): Promise<Doc<"planEvents">> {
  const event = await ctx.db.get("planEvents", eventId);
  if (event === null || event.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "予定が見つかりません", resource: "予定" }));
  }
  return event;
}

async function requireOwnedItem(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  itemId: Id<"items">,
): Promise<void> {
  const item = await ctx.db.get("items", itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
}

async function recordForSave(
  ctx: MutationCtx,
  ownerId: string,
  itemId: Id<"items"> | undefined,
  existing: Doc<"planEvents"> | null,
): Promise<PlanRecord> {
  if (itemId === undefined) {
    return { kind: "none" };
  }
  await requireOwnedItem(ctx, ownerId, itemId);
  if (
    existing !== null &&
    existing.record.kind === "item" &&
    existing.record.itemId === itemId &&
    existing.record.materializedRowId !== undefined
  ) {
    return {
      itemId,
      kind: "item",
      materializedRowId: existing.record.materializedRowId,
    };
  }
  return { itemId, kind: "item" };
}

async function recordState(ctx: QueryCtx, event: Doc<"planEvents">): Promise<PlanRecordStateDto> {
  if (event.record.kind === "none") {
    return { kind: "not-applicable" };
  }
  if (event.record.materializedRowId === undefined) {
    return { kind: "awaiting-open" };
  }
  const row = await ctx.db.get("rows", event.record.materializedRowId);
  if (row === null || row.deletedAt !== undefined) {
    return { kind: "removed" };
  }
  return { kind: "materialized", status: row.status };
}

function toDto(event: Doc<"planEvents">, state: PlanRecordStateDto): PlanEventDto {
  const materializedRowId =
    event.record.kind === "item" ? event.record.materializedRowId : undefined;
  return {
    _id: event._id,
    dateJst: event.dateJst,
    endTime: formatMinuteOfDay(event.endMinute),
    itemId: event.record.kind === "item" ? event.record.itemId : undefined,
    ...(materializedRowId === undefined ? {} : { materializedRowId }),
    priority: event.priority,
    recordState: state,
    startTime: formatMinuteOfDay(event.startMinute),
    title: event.title,
  };
}

export function appliedTemplateOnDate(
  events: readonly { sourceTemplateId?: Id<"planTemplates"> }[],
): Id<"planTemplates"> | null {
  const ids = new Set(
    events.flatMap((event) =>
      event.sourceTemplateId === undefined ? [] : [event.sourceTemplateId],
    ),
  );
  if (ids.size !== 1) {
    return null;
  }
  const [templateId] = ids;
  return templateId ?? null;
}

export async function eventsOnDate(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"planEvents">[]> {
  return await ctx.db
    .query("planEvents")
    .withIndex("by_owner_and_dateJst_and_startMinute", (q) =>
      q.eq("ownerId", ownerId).eq("dateJst", dateJst),
    )
    .collect();
}

async function unplannedConfirmedMinutes(
  ctx: QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<number> {
  const [rows, events] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
      .collect(),
    eventsOnDate(ctx, ownerId, dateJst),
  ]);
  const confirmed = rows.filter((row) => row.deletedAt === undefined && row.status === "確定");
  const confirmedById = new Map(confirmed.map((row) => [row._id, row]));
  let painted = 0;
  const counted = new Set<Id<"rows">>();
  for (const event of events) {
    if (event.record.kind !== "item" || event.record.materializedRowId === undefined) {
      continue;
    }
    const rowId = event.record.materializedRowId;
    if (counted.has(rowId)) {
      continue;
    }
    const row = confirmedById.get(rowId);
    if (row === undefined) {
      continue;
    }
    counted.add(rowId);
    painted += row.minutes;
  }
  const total = confirmed.reduce((sum, row) => sum + row.minutes, 0);
  return Math.max(0, total - painted);
}

export async function listWindow(
  ctx: QueryCtx,
  ownerId: string,
  args: {
    anchorDateJst: string;
    paginationOpts: { cursor: string | null; numItems: number };
    view: PlanView;
  },
): Promise<{
  appliedTemplateId: Id<"planTemplates"> | null;
  continueCursor: string;
  isDone: boolean;
  page: PlanEventDto[];
  unplannedConfirmedMinutes: number;
}> {
  const anchorDateJst = requireDateJst(args.anchorDateJst);
  const { endExclusive, start } = planListDateRange(args.view, anchorDateJst);
  const page = await ctx.db
    .query("planEvents")
    .withIndex("by_owner_and_dateJst_and_startMinute", (q) =>
      q.eq("ownerId", ownerId).gte("dateJst", start).lt("dateJst", endExclusive),
    )
    .paginate(args.paginationOpts);
  const [dtoPage, anchored] = await Promise.all([
    Promise.all(page.page.map(async (event) => toDto(event, await recordState(ctx, event)))),
    eventsOnDate(ctx, ownerId, anchorDateJst),
  ]);
  return {
    appliedTemplateId: appliedTemplateOnDate(anchored),
    continueCursor: page.continueCursor,
    isDone: page.isDone,
    page: dtoPage,
    unplannedConfirmedMinutes: await unplannedConfirmedMinutes(ctx, ownerId, anchorDateJst),
  };
}

export async function save(
  ctx: MutationCtx,
  ownerId: string,
  args: SaveArgs,
): Promise<Id<"planEvents">> {
  const dateJst = requirePlanEventDateJst(args.dateJst, serverTodayJst());
  const title = args.title.trim();
  if (title === "" && args.itemId === undefined) {
    throwDomain(new ValidationFailedError({ message: PLAN_TITLE_MESSAGE }));
  }
  const { endMinute, startMinute } = parsePlanWindow({
    endTime: args.endTime,
    startTime: args.startTime,
  });
  const existing =
    args.eventId === undefined ? null : await requireOwnedEvent(ctx, ownerId, args.eventId);
  if (existing !== null && isFrozen(existing)) {
    if (existing.dateJst !== dateJst || currentItemId(existing) !== args.itemId) {
      throwDomain(new ValidationFailedError({ message: PLAN_FROZEN_MESSAGE }));
    }
  }
  const record = await recordForSave(ctx, ownerId, args.itemId, existing);
  let sourceTemplateId = args.sourceTemplateId ?? existing?.sourceTemplateId;
  if (sourceTemplateId === undefined) {
    sourceTemplateId =
      appliedTemplateOnDate(await eventsOnDate(ctx, ownerId, dateJst)) ?? undefined;
  }
  const sourceFields = sourceTemplateId === undefined ? {} : { sourceTemplateId };
  const fields =
    record.kind === "none"
      ? {
          dateJst,
          endMinute,
          ownerId,
          priority: args.priority,
          record: { kind: "none" as const },
          startMinute,
          title,
          ...sourceFields,
        }
      : {
          dateJst,
          endMinute,
          ownerId,
          priority: args.priority,
          record,
          startMinute,
          title,
          ...sourceFields,
        };
  if (existing === null) {
    const eventId = await ctx.db.insert("planEvents", fields);
    await schedulePlanSync(ctx, ownerId, [eventId]);
    return eventId;
  }
  await ctx.db.patch("planEvents", existing._id, fields);
  await schedulePlanSync(ctx, ownerId, [existing._id]);
  return existing._id;
}

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { eventId: Id<"planEvents"> },
): Promise<null> {
  await requireOwnedEvent(ctx, ownerId, args.eventId);
  await ctx.db.delete("planEvents", args.eventId);
  await schedulePlanSync(ctx, ownerId, [args.eventId]);
  return null;
}

export async function saveDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; events: PlanEventDraft[]; todayJst: string },
): Promise<Id<"planEvents">[]> {
  const serverToday = serverTodayJst();
  const dateJst = requirePlanEventDateJst(args.dateJst, serverToday);
  const existing = await eventsOnDate(ctx, ownerId, dateJst);
  const inheritId = appliedTemplateOnDate(existing);
  const keep = new Set(
    args.events.flatMap((draft) => (draft.eventId === undefined ? [] : [draft.eventId])),
  );
  await Promise.all(
    existing.flatMap((event) =>
      keep.has(event._id) ? [] : [remove(ctx, ownerId, { eventId: event._id })],
    ),
  );
  return await Promise.all(
    args.events.map((draft) =>
      save(ctx, ownerId, {
        dateJst,
        endTime: draft.endTime,
        eventId: draft.eventId,
        itemId: draft.itemId,
        priority: draft.priority,
        sourceTemplateId: draft.sourceTemplateId ?? inheritId ?? undefined,
        startTime: draft.startTime,
        title: draft.title,
        todayJst: serverToday,
      }),
    ),
  );
}
