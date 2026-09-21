import type { DateJst } from "~domain/jst";
import { planPriorityFromGoogleColorId } from "~domain/planEvent";

import { allDayEventsForDay, timedEventsForDay } from "~/features/plan/lib/board-schedule-events";
import {
  toExternalScheduleEvents,
  toPlanScheduleEvents,
} from "~/features/plan/lib/board-schedule-events";
import { toPlanScheduleBlocks } from "~/features/plan/lib/plan-event-blocks";
import {
  planEventDisplayName,
  type PlanDayScheduleEntry,
} from "~/features/plan/lib/plan-event-display-name";
import { instantsToPlanTimes } from "~/features/plan/lib/plan-event-instants";
import type { PlanTemplateEventFormInput } from "~/features/plan/schemas/plan-template-schema";
import { NONE_ITEM_VALUE } from "~/features/plan/schemas/plan-template-schema";
import type { PlanCatalogItem, PlanEventDto, PlanExternalEvent } from "~/features/plan/types/plan";
import { parseItemId, unwrapItemId } from "~/types/item";

function compareStart(left: string, right: string): number {
  return left.localeCompare(right);
}

function externalEntry(
  external: PlanExternalEvent,
  dateJst: DateJst,
  allDay: boolean,
): PlanDayScheduleEntry | null {
  if (allDay) {
    return {
      endTime: "24:00",
      external: true,
      key: `external:${external._id}:allday`,
      name: `${external.title}（外部）`,
      startTime: "00:00",
    };
  }
  const times = instantsToPlanTimes(external.startAt, external.endAt);
  if (times === null || times.dateJst !== dateJst) {
    return null;
  }
  const priority =
    external.colorId === null ? undefined : planPriorityFromGoogleColorId(external.colorId);
  return {
    endTime: times.endTime,
    external: true,
    key: `external:${external._id}`,
    name: `${external.title}（外部）`,
    priority,
    startTime: times.startTime,
  };
}

export function planDayScheduleEntries(args: {
  dateJst: DateJst;
  draftTemplateEvents?: readonly PlanTemplateEventFormInput[];
  events: readonly PlanEventDto[];
  externals: readonly PlanExternalEvent[];
  items: readonly PlanCatalogItem[];
}): PlanDayScheduleEntry[] {
  const entries: PlanDayScheduleEntry[] = [];

  for (const event of args.events) {
    entries.push({
      endTime: event.endTime,
      key: `event:${event._id}`,
      name: planEventDisplayName(event.title, event.itemId, args.items),
      priority: event.priority,
      startTime: event.startTime,
    });
  }

  const blocks = toPlanScheduleBlocks(args.events, args.items);
  const scheduleEvents = [
    ...toPlanScheduleEvents(blocks),
    ...toExternalScheduleEvents(args.externals),
  ];
  for (const external of timedEventsForDay(scheduleEvents, args.dateJst)) {
    const source = args.externals.find((entry) => `external:${entry._id}` === String(external.id));
    if (source === undefined) {
      continue;
    }
    const entry = externalEntry(source, args.dateJst, false);
    if (entry !== null) {
      entries.push(entry);
    }
  }
  for (const external of allDayEventsForDay(scheduleEvents, args.dateJst)) {
    const source = args.externals.find((entry) => `external:${entry._id}` === String(external.id));
    if (source === undefined) {
      continue;
    }
    const entry = externalEntry(source, args.dateJst, true);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  if (args.draftTemplateEvents !== undefined) {
    for (const [index, draft] of args.draftTemplateEvents.entries()) {
      const itemId =
        draft.itemId === NONE_ITEM_VALUE ? undefined : unwrapItemId(parseItemId(draft.itemId));
      entries.push({
        draft: true,
        endTime: draft.endTime,
        key: `draft:${index}`,
        name: planEventDisplayName(draft.title, itemId, args.items),
        priority: draft.priority,
        startTime: draft.startTime,
      });
    }
  }

  entries.sort((left, right) => compareStart(left.startTime, right.startTime));
  return entries;
}
