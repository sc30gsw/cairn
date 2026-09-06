import type { ScheduleEventData } from "@mantine/schedule";
import { useEffect, useState, type MouseEvent, type RefObject } from "react";
import { scheduleListRange, type BoardScheduleView } from "~domain/boardScheduleRange";
import { addDaysJst } from "~domain/jst";

import type { BoardScheduleAllDayExpandAnchor } from "~/features/board/components/board-schedule-all-day-expand";
import {
  blockFormValues,
  slotFormValues,
} from "~/features/board/components/board-schedule-event-form";
import {
  allDayEventsForDay,
  boardAllDayMoreDate,
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardExternalEventId,
  boardExternalEventIds,
  boardScheduleBlockIds,
  boardScheduleEventSourceId,
  isBoardAllDayMoreEvent,
  isBoardExternalEvent,
  toBoardScheduleEvents,
  toExternalScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { boardMoreLabel } from "~/features/board/lib/board-schedule-layout";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type {
  BoardExternalEvent,
  BoardRow,
  BoardScheduleBlock,
} from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

type UseBoardScheduleUiArgs = {
  anchorDateJst: string;
  blocks: readonly BoardScheduleBlock[];
  externals: readonly BoardExternalEvent[];
  rows: readonly BoardRow[];
  scheduleRootRef: RefObject<HTMLDivElement | null>;
  scheduleView: BoardScheduleView;
  todayJst: string;
};

export function useBoardScheduleUi({
  anchorDateJst,
  blocks,
  externals,
  rows,
  scheduleRootRef,
  scheduleView,
  todayJst,
}: UseBoardScheduleUiArgs) {
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<BoardScheduleEventInput | null>(null);
  const [expandedAllDayAnchor, setExpandedAllDayAnchor] =
    useState<BoardScheduleAllDayExpandAnchor | null>(null);
  const [openedExternal, setOpenedExternal] = useState<BoardExternalEvent | null>(null);

  const editableBlockIds = boardScheduleBlockIds(blocks);
  const externalEventIds = boardExternalEventIds(externals);
  const editableExternalEventIds = boardExternalEventIds(
    externals.filter((external) => external.canEdit),
  );
  const clickableEventIds = new Set([...editableBlockIds, ...externalEventIds]);
  const baseEvents = [
    ...toBoardScheduleEvents(todayJst, rows, blocks),
    ...toExternalScheduleEvents(externals),
  ];
  const moreLabel = SCHEDULE_LABELS_JA.moreLabel ?? boardMoreLabel;
  const { rangeStart, rangeEndExclusive } = scheduleListRange(scheduleView, anchorDateJst);
  const visibleDays: string[] = [];
  for (
    let day = rangeStart.slice(0, 10);
    day < rangeEndExclusive.slice(0, 10);
    day = addDaysJst(day, 1)
  ) {
    visibleDays.push(day);
  }
  const { events: scheduleEvents } = withAllDayOverflow(
    baseEvents,
    BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel,
    visibleDays,
  );
  const dayAllDayEvents = allDayEventsForDay(baseEvents, anchorDateJst);
  const expandedAllDayEvents =
    expandedAllDayAnchor === null
      ? []
      : allDayEventsForDay(baseEvents, expandedAllDayAnchor.dateJst);

  function openAllDayExpand(date: string, target: HTMLElement) {
    const scheduleRoot = scheduleRootRef.current;
    if (scheduleRoot === null) {
      return;
    }
    const rootRect = scheduleRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setExpandedAllDayAnchor({
      dateJst: date,
      left: targetRect.left - rootRect.left,
      top: targetRect.bottom - rootRect.top + 4,
      width: targetRect.width,
    });
  }

  useEffect(() => {
    if (expandedAllDayAnchor === null) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const scheduleRoot = scheduleRootRef.current;
      if (scheduleRoot === null) {
        return;
      }
      const expandPanel = scheduleRoot.querySelector("[data-board-all-day-expand]");
      if (expandPanel?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-board-all-day-more]")) {
        return;
      }
      setExpandedAllDayAnchor(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expandedAllDayAnchor, scheduleRootRef]);

  function collapseAllDayExpand() {
    setExpandedAllDayAnchor(null);
  }

  function openCreate(start: string, end: string) {
    collapseAllDayExpand();
    const values = slotFormValues(rows, start, end);
    if (values === null) {
      return;
    }
    setFormValues(values);
    setFormOpened(true);
  }

  function openEdit(block: BoardScheduleBlock) {
    collapseAllDayExpand();
    setFormValues(blockFormValues(block));
    setFormOpened(true);
  }

  function openEditFromEvent(event: ScheduleEventData) {
    const block = blocks.find((entry) => entry._id === boardScheduleEventSourceId(event.id));
    if (block === undefined) {
      return;
    }
    openEdit(block);
  }

  function openFromEvent(event: ScheduleEventData) {
    if (isBoardExternalEvent(event.id)) {
      const externalId = boardExternalEventId(event.id);
      setOpenedExternal(externals.find((entry) => entry._id === externalId) ?? null);
      return;
    }
    openEditFromEvent(event);
  }

  function handleEventClick(event: ScheduleEventData, clickEvent: MouseEvent<HTMLButtonElement>) {
    if (isBoardAllDayMoreEvent(event.id)) {
      openAllDayExpand(boardAllDayMoreDate(event.id), clickEvent.currentTarget);
      return;
    }
    collapseAllDayExpand();
    openFromEvent(event);
  }

  function closeExternal() {
    setOpenedExternal(null);
  }

  return {
    baseEvents,
    clickableEventIds,
    closeExternal,
    collapseAllDayExpand,
    dayAllDayEvents,
    editableBlockIds,
    editableExternalEventIds,
    expandedAllDayAnchor,
    expandedAllDayEvents,
    externalEventIds,
    formOpened,
    formValues,
    handleEventClick,
    moreLabel,
    openAllDayExpand,
    openCreate,
    openedExternal,
    openEditFromEvent,
    openFromEvent,
    scheduleEvents,
    setFormOpened,
  };
}
