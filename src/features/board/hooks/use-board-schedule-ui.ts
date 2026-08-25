import type { ScheduleEventData } from "@mantine/schedule";
import { useEffect, useState, type MouseEvent, type RefObject } from "react";

import type { BoardScheduleAllDayExpandAnchor } from "~/features/board/components/board-schedule-all-day-expand";
import {
  blockFormValues,
  slotFormValues,
} from "~/features/board/components/board-schedule-event-form";
import {
  allDayEventsForDay,
  boardAllDayMoreDate,
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardScheduleBlockIds,
  isBoardAllDayMoreEvent,
  toBoardScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { boardMoreLabel } from "~/features/board/lib/board-schedule-layout";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

type UseBoardScheduleUiArgs = {
  anchorDateJst: string;
  blocks: readonly BoardScheduleBlock[];
  rows: readonly BoardRow[];
  scheduleRootRef: RefObject<HTMLDivElement | null>;
  todayJst: string;
};

export function useBoardScheduleUi({
  anchorDateJst,
  blocks,
  rows,
  scheduleRootRef,
  todayJst,
}: UseBoardScheduleUiArgs) {
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<BoardScheduleEventInput | null>(null);
  const [expandedAllDayAnchor, setExpandedAllDayAnchor] =
    useState<BoardScheduleAllDayExpandAnchor | null>(null);

  const editableBlockIds = boardScheduleBlockIds(blocks);
  const baseEvents = toBoardScheduleEvents(todayJst, rows, blocks);
  const moreLabel = SCHEDULE_LABELS_JA.moreLabel ?? boardMoreLabel;
  const { events: scheduleEvents } = withAllDayOverflow(
    baseEvents,
    BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel,
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
    if (!editableBlockIds.has(String(event.id))) {
      return;
    }
    const block = blocks.find((entry) => entry._id === event.id);
    if (block === undefined) {
      return;
    }
    openEdit(block);
  }

  function handleEventClick(event: ScheduleEventData, clickEvent: MouseEvent<HTMLButtonElement>) {
    if (isBoardAllDayMoreEvent(event.id)) {
      openAllDayExpand(boardAllDayMoreDate(event.id), clickEvent.currentTarget);
      return;
    }
    collapseAllDayExpand();
    openEditFromEvent(event);
  }

  return {
    baseEvents,
    collapseAllDayExpand,
    dayAllDayEvents,
    editableBlockIds,
    expandedAllDayAnchor,
    expandedAllDayEvents,
    formOpened,
    formValues,
    handleEventClick,
    moreLabel,
    openAllDayExpand,
    openCreate,
    openEditFromEvent,
    scheduleEvents,
    setFormOpened,
  };
}
