import type { ScheduleEventData, ScheduleProps } from "@mantine/schedule";

import type { useBoardScheduleActions } from "~/features/board/hooks/use-board-schedule-actions";
import type { useBoardScheduleUi } from "~/features/board/hooks/use-board-schedule-ui";
import {
  boardExternalEventId,
  boardScheduleEventSourceId,
  isBoardAllDayMoreEvent,
  isBoardExternalEvent,
  movedScheduleRange,
} from "~/features/board/lib/board-schedule-events";

type BoardScheduleUi = ReturnType<typeof useBoardScheduleUi>;
type ScheduleSources = Pick<Parameters<typeof useBoardScheduleUi>[0], "blocks" | "externals">;
type UseBoardScheduleInteractionsArgs = ScheduleSources & {
  actions: Pick<ReturnType<typeof useBoardScheduleActions>, "onMoveBlock" | "onMoveExternal">;
  canCreate: boolean;
  isCompact: boolean;
  pending: boolean;
  ui: BoardScheduleUi;
};
type EditableScheduleEvent =
  | { kind: "block"; value: ScheduleSources["blocks"][number] }
  | { kind: "external"; value: ScheduleSources["externals"][number] };

function renderEventBody(event: ScheduleEventData) {
  if (isBoardAllDayMoreEvent(event.id)) {
    return <span data-board-all-day-more="true">{event.title}</span>;
  }
  if (isBoardExternalEvent(event.id)) {
    return <span data-board-external="true">{event.title}</span>;
  }
  return event.title;
}

export function useBoardScheduleInteractions({
  actions,
  blocks,
  canCreate,
  externals,
  isCompact,
  pending,
  ui,
}: UseBoardScheduleInteractionsArgs) {
  function findEditableScheduleEvent(
    eventId: ScheduleEventData["id"],
  ): EditableScheduleEvent | null {
    const sourceId = boardScheduleEventSourceId(eventId);
    if (ui.editableExternalEventIds.has(sourceId)) {
      const external = externals.find((entry) => entry._id === boardExternalEventId(eventId));
      return external === undefined ? null : { kind: "external", value: external };
    }
    if (!ui.editableBlockIds.has(sourceId)) {
      return null;
    }
    const block = blocks.find((entry) => entry._id === sourceId);
    return block === undefined ? null : { kind: "block", value: block };
  }

  function saveEventRange(
    eventId: ScheduleEventData["id"],
    startAt: EditableScheduleEvent["value"]["startAt"],
    endAt: EditableScheduleEvent["value"]["endAt"],
  ) {
    const editableEvent = findEditableScheduleEvent(eventId);
    if (editableEvent === null) return;
    if (editableEvent.kind === "external") {
      void actions.onMoveExternal({ endAt, externalId: editableEvent.value._id, startAt });
      return;
    }
    void actions.onMoveBlock({ blockId: editableEvent.value._id, endAt, startAt });
  }

  function canEditEvent(event: ScheduleEventData) {
    return (
      !pending &&
      (ui.editableBlockIds.has(boardScheduleEventSourceId(event.id)) ||
        ui.editableExternalEventIds.has(boardScheduleEventSourceId(event.id)))
    );
  }

  const interactionProps = {
    canDragEvent: canEditEvent,
    canResizeEvent: canEditEvent,
    renderEventBody,
    withDragSlotSelect: !pending && canCreate && !isCompact,
    withEventsDragAndDrop: !pending && !isCompact,
    withEventResize: !pending && !isCompact,
  } satisfies Partial<ScheduleProps>;

  if (pending) return interactionProps;

  return {
    ...interactionProps,
    onEventClick: ui.handleEventClick,
    onEventDrop: ({ event, eventId, newStart }) => {
      ui.collapseAllDayExpand();
      const editableEvent = findEditableScheduleEvent(eventId);
      if (editableEvent === null) return;
      const range = movedScheduleRange(editableEvent.value, event.start, newStart);
      saveEventRange(eventId, range.startAt, range.endAt);
    },
    onEventResize: ({ eventId, newEnd, newStart }) => {
      ui.collapseAllDayExpand();
      saveEventRange(eventId, newStart, newEnd);
    },
    onTimeSlotClick: ({ slotEnd, slotStart }) => ui.openCreate(slotStart, slotEnd),
    onSlotDragEnd: ui.openCreate,
  } satisfies Partial<ScheduleProps>;
}
