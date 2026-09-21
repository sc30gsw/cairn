import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import {
  formatMinuteOfDay,
  parsePlanWindow,
  PLAN_TEMPLATE_NAME_MESSAGE,
  PLAN_TITLE_MESSAGE,
} from "../../lib/planEvent";
import type {
  PlanTemplateDto,
  PlanTemplateEventDraft,
  PlanTemplateEventDto,
} from "../../lib/validators/plan";
import { eventsOnDate, saveDay } from "./events";

type TemplateRecord = { kind: "none" } | { itemId: Id<"items">; kind: "item" };

function toEventDto(event: Doc<"planTemplateEvents">): PlanTemplateEventDto {
  return {
    _id: event._id,
    endTime: formatMinuteOfDay(event.endMinute),
    itemId: event.record.kind === "item" ? event.record.itemId : undefined,
    priority: event.priority,
    startTime: formatMinuteOfDay(event.startMinute),
    title: event.title,
  };
}

async function requireOwnedTemplate(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  templateId: Id<"planTemplates">,
): Promise<Doc<"planTemplates">> {
  const template = await ctx.db.get("planTemplates", templateId);
  if (template === null || template.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "計画プリセットが見つかりません", resource: "計画プリセット" }),
    );
  }
  return template;
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

async function settingsRow(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"planSettings"> | null> {
  return await ctx.db
    .query("planSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}

async function eventsForTemplate(
  ctx: MutationCtx | QueryCtx,
  templateId: Id<"planTemplates">,
): Promise<Doc<"planTemplateEvents">[]> {
  return await ctx.db
    .query("planTemplateEvents")
    .withIndex("by_templateId_and_startMinute", (q) => q.eq("templateId", templateId))
    .collect();
}

async function recordForDraft(
  ctx: MutationCtx,
  ownerId: string,
  itemId: Id<"items"> | undefined,
): Promise<TemplateRecord> {
  if (itemId === undefined) {
    return { kind: "none" };
  }
  await requireOwnedItem(ctx, ownerId, itemId);
  return { itemId, kind: "item" };
}

async function persistEvent(
  ctx: MutationCtx,
  ownerId: string,
  templateId: Id<"planTemplates">,
  draft: PlanTemplateEventDraft,
): Promise<Id<"planTemplateEvents">> {
  const title = draft.title.trim();
  if (title === "" && draft.itemId === undefined) {
    throwDomain(new ValidationFailedError({ message: PLAN_TITLE_MESSAGE }));
  }
  const { endMinute, startMinute } = parsePlanWindow({
    endTime: draft.endTime,
    startTime: draft.startTime,
  });
  const record = await recordForDraft(ctx, ownerId, draft.itemId);
  const fields =
    record.kind === "none"
      ? {
          endMinute,
          ownerId,
          priority: draft.priority,
          record: { kind: "none" as const },
          startMinute,
          templateId,
          title,
        }
      : {
          endMinute,
          ownerId,
          priority: draft.priority,
          record,
          startMinute,
          templateId,
          title,
        };
  if (draft.templateEventId === undefined) {
    return await ctx.db.insert("planTemplateEvents", fields);
  }
  const existing = await ctx.db.get("planTemplateEvents", draft.templateEventId);
  if (existing === null || existing.ownerId !== ownerId || existing.templateId !== templateId) {
    throwDomain(
      new NotFoundError({ message: "計画プリセットが見つかりません", resource: "計画プリセット" }),
    );
  }
  await ctx.db.patch("planTemplateEvents", existing._id, fields);
  return existing._id;
}

export async function list(ctx: QueryCtx, ownerId: string): Promise<PlanTemplateDto[]> {
  const [templates, settings] = await Promise.all([
    ctx.db
      .query("planTemplates")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    settingsRow(ctx, ownerId),
  ]);
  const forgottenId = settings?.forgottenTemplateId;
  return await Promise.all(
    templates.map(async (template) => ({
      _id: template._id,
      events: (await eventsForTemplate(ctx, template._id)).map(toEventDto),
      forgotten: forgottenId === template._id,
      name: template.name,
    })),
  );
}

export async function save(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    events: PlanTemplateEventDraft[];
    name: string;
    templateId?: Id<"planTemplates">;
  },
): Promise<Id<"planTemplates">> {
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: PLAN_TEMPLATE_NAME_MESSAGE }));
  }
  const template =
    args.templateId === undefined
      ? null
      : await requireOwnedTemplate(ctx, ownerId, args.templateId);
  const templateId =
    template === null ? await ctx.db.insert("planTemplates", { name, ownerId }) : template._id;
  if (template !== null) {
    await ctx.db.patch("planTemplates", templateId, { name });
  }
  const existing = await eventsForTemplate(ctx, templateId);
  const keep = new Set(
    args.events.flatMap((draft) =>
      draft.templateEventId === undefined ? [] : [draft.templateEventId],
    ),
  );
  await Promise.all(
    existing.flatMap((event) =>
      keep.has(event._id) ? [] : [ctx.db.delete("planTemplateEvents", event._id)],
    ),
  );
  await Promise.all(args.events.map((draft) => persistEvent(ctx, ownerId, templateId, draft)));
  return templateId;
}

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { templateId: Id<"planTemplates"> },
): Promise<null> {
  await requireOwnedTemplate(ctx, ownerId, args.templateId);
  const [events, settings] = await Promise.all([
    eventsForTemplate(ctx, args.templateId),
    settingsRow(ctx, ownerId),
  ]);
  await Promise.all(events.map((event) => ctx.db.delete("planTemplateEvents", event._id)));
  if (settings !== null && settings.forgottenTemplateId === args.templateId) {
    await ctx.db.patch("planSettings", settings._id, { forgottenTemplateId: undefined });
  }
  await ctx.db.delete("planTemplates", args.templateId);
  return null;
}

export async function setForgottenTemplate(
  ctx: MutationCtx,
  ownerId: string,
  args: { templateId: Id<"planTemplates"> | null },
): Promise<null> {
  if (args.templateId !== null) {
    await requireOwnedTemplate(ctx, ownerId, args.templateId);
  }
  const existing = await settingsRow(ctx, ownerId);
  if (existing === null) {
    await ctx.db.insert("planSettings", {
      forgottenTemplateId: args.templateId ?? undefined,
      ownerId,
    });
    return null;
  }
  await ctx.db.patch("planSettings", existing._id, {
    forgottenTemplateId: args.templateId ?? undefined,
  });
  return null;
}

export async function applyToEmptyDate(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; templateId?: Id<"planTemplates"> },
): Promise<{ applied: boolean }> {
  const dateJst = requireDateJst(args.dateJst);
  const existingEvents = await eventsOnDate(ctx, ownerId, dateJst);
  if (existingEvents.length > 0) {
    return { applied: false };
  }
  const settings = await settingsRow(ctx, ownerId);
  const templateId = args.templateId ?? settings?.forgottenTemplateId;
  if (templateId === undefined) {
    return { applied: false };
  }
  await requireOwnedTemplate(ctx, ownerId, templateId);
  const templateEvents = await eventsForTemplate(ctx, templateId);
  if (templateEvents.length === 0) {
    return { applied: false };
  }
  await saveDay(ctx, ownerId, {
    dateJst,
    events: templateEvents.map((event) => ({
      endTime: formatMinuteOfDay(event.endMinute),
      itemId: event.record.kind === "item" ? event.record.itemId : undefined,
      priority: event.priority,
      startTime: formatMinuteOfDay(event.startMinute),
      title: event.title,
    })),
  });
  return { applied: true };
}
