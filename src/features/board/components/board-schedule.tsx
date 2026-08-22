import { Card } from "@mantine/core";
import { Schedule, type ScheduleEventData, type ScheduleViewLevel } from "@mantine/schedule";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { DateJst } from "~domain/jst";

import {
  BoardScheduleAllDayExpand,
  type BoardScheduleAllDayExpandAnchor,
} from "~/features/board/components/board-schedule-all-day-expand";
import { BoardScheduleDayAllDayRow } from "~/features/board/components/board-schedule-day-all-day-row";
import {
  blockFormValues,
  BoardScheduleEventForm,
  slotFormValues,
} from "~/features/board/components/board-schedule-event-form";
import type {
  BoardScheduleCreateInput,
  BoardScheduleMoveInput,
  BoardScheduleRemoveInput,
  BoardScheduleUpdateInput,
} from "~/features/board/hooks/board-mutations";
import { boardScheduleAllDayRenderEvent } from "~/features/board/lib/board-schedule-all-day-render-event";
import {
  allDayEventsForDay,
  boardAllDayMoreDate,
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardScheduleBlockIds,
  isBoardAllDayMoreEvent,
  toBoardScheduleEvents,
  withoutAllDayEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

import classes from "~/features/board/components/board-schedule.module.css";

const ALL_DAY_ROW_HEIGHT = "1.25rem";
const ALL_DAY_VISIBLE_ROWS = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;
const DAY_ALL_DAY_LABEL_WIDTH = "80px";

const BOARD_WEEK_VIEW_PROPS = {
  allDaySlotHeight: `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS})`,
  classNames: {
    weekViewAllDaySlots: classes.weekAllDaySlots,
    weekViewAllDaySlotsEvents: classes.weekAllDayEvents,
    weekViewAllDaySlotsList: classes.weekAllDaySlotsList,
  },
  firstDayOfWeek: 1 as const,
  renderEvent: boardScheduleAllDayRenderEvent,
};

type BoardScheduleProps = {
  anchorDateJst: DateJst;
  blocks: readonly BoardScheduleBlock[];
  checkpoint: BoardMastery | null;
  dateJst: DateJst;
  onCreateBlock: (input: BoardScheduleCreateInput) => Promise<void>;
  onMoveBlock: (input: BoardScheduleMoveInput) => Promise<void>;
  onRemoveBlock: (input: BoardScheduleRemoveInput) => Promise<void>;
  onUpdateBlock: (input: BoardScheduleUpdateInput) => Promise<void>;
  rows: readonly BoardRow[];
};

export function BoardSchedule({
  anchorDateJst,
  blocks,
  checkpoint,
  dateJst,
  onCreateBlock,
  onMoveBlock,
  onRemoveBlock,
  onUpdateBlock,
  rows,
}: BoardScheduleProps) {
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<BoardScheduleEventInput | null>(null);
  const [scheduleView, setScheduleView] = useState<ScheduleViewLevel>("week");
  const [expandedAllDayAnchor, setExpandedAllDayAnchor] =
    useState<BoardScheduleAllDayExpandAnchor | null>(null);
  const scheduleRootRef = useRef<HTMLDivElement>(null);
  const editingBlockIdRef = useRef<BoardScheduleBlock["_id"] | undefined>(undefined);
  const editableBlockIds = boardScheduleBlockIds(blocks);
  const baseEvents = toBoardScheduleEvents(dateJst, rows, checkpoint, blocks);
  const moreLabel = SCHEDULE_LABELS_JA.moreLabel ?? ((count: number) => `+${count}件`);
  const { events: overflowEvents } = withAllDayOverflow(
    baseEvents,
    BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel,
  );
  const scheduleEvents =
    scheduleView === "day" ? withoutAllDayEvents(overflowEvents) : overflowEvents;
  const dayAllDayEvents = allDayEventsForDay(baseEvents, anchorDateJst);
  const expandedAllDayEvents =
    expandedAllDayAnchor === null
      ? []
      : allDayEventsForDay(baseEvents, expandedAllDayAnchor.dateJst);

  useEffect(() => {
    editingBlockIdRef.current = formValues?.blockId as BoardScheduleBlock["_id"] | undefined;
  }, [formValues]);

  useEffect(() => {
    if (expandedAllDayAnchor === null) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const root = scheduleRootRef.current;
      if (root === null) {
        return;
      }
      const expandPanel = root.querySelector("[data-board-all-day-expand]");
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
  }, [expandedAllDayAnchor]);

  function collapseAllDayExpand() {
    setExpandedAllDayAnchor(null);
  }

  function openAllDayExpand(date: string, target: HTMLElement) {
    const root = scheduleRootRef.current;
    if (root === null) {
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setExpandedAllDayAnchor({
      dateJst: date,
      left: targetRect.left - rootRect.left,
      top: targetRect.bottom - rootRect.top + 4,
      width: targetRect.width,
    });
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

  function handleEventClick(event: ScheduleEventData, clickEvent: MouseEvent<HTMLButtonElement>) {
    if (isBoardAllDayMoreEvent(event.id)) {
      openAllDayExpand(boardAllDayMoreDate(event.id), clickEvent.currentTarget);
      return;
    }
    collapseAllDayExpand();
    if (!editableBlockIds.has(String(event.id))) {
      return;
    }
    const block = blocks.find((entry) => entry._id === event.id);
    if (block === undefined) {
      return;
    }
    openEdit(block);
  }

  return (
    <>
      <Card
        className={classes.boardSchedule}
        padding="md"
        style={
          {
            "--board-all-day-row-height": ALL_DAY_ROW_HEIGHT,
            "--board-all-day-visible-rows": ALL_DAY_VISIBLE_ROWS,
            "--board-day-all-day-label-width": DAY_ALL_DAY_LABEL_WIDTH,
          } as CSSProperties
        }
      >
        <div className={classes.boardScheduleRoot} ref={scheduleRootRef}>
          {scheduleView === "day" ? (
            <BoardScheduleDayAllDayRow
              events={dayAllDayEvents}
              limit={BOARD_ALL_DAY_VISIBLE_LIMIT}
              moreLabel={moreLabel}
              onMoreClick={(target) => {
                openAllDayExpand(anchorDateJst, target);
              }}
            />
          ) : null}
          <Schedule
            canDragEvent={(event) => editableBlockIds.has(String(event.id))}
            date={anchorDateJst}
            defaultView="week"
            events={scheduleEvents}
            labels={SCHEDULE_LABELS_JA}
            locale="ja"
            monthViewProps={{ firstDayOfWeek: 1 }}
            onEventClick={handleEventClick}
            onEventDrop={({ eventId, newEnd, newStart }) => {
              collapseAllDayExpand();
              if (!editableBlockIds.has(String(eventId))) {
                return;
              }
              void onMoveBlock({
                blockId: eventId as BoardScheduleBlock["_id"],
                endAt: newEnd,
                startAt: newStart,
              });
            }}
            onSlotDragEnd={(rangeStart, rangeEnd) => {
              openCreate(rangeStart, rangeEnd);
            }}
            onTimeSlotClick={({ slotEnd, slotStart }) => {
              openCreate(slotStart, slotEnd);
            }}
            onViewChange={setScheduleView}
            renderEventBody={(event) =>
              isBoardAllDayMoreEvent(event.id) ? (
                <span data-board-all-day-more="true">{event.title}</span>
              ) : (
                event.title
              )
            }
            dayViewProps={{ withAllDaySlot: false }}
            view={scheduleView}
            weekViewProps={BOARD_WEEK_VIEW_PROPS}
            withDragSlotSelect={rows.length > 0}
            withEventsDragAndDrop
          />
          {expandedAllDayAnchor === null ? null : (
            <BoardScheduleAllDayExpand
              anchor={expandedAllDayAnchor}
              events={expandedAllDayEvents}
              onClose={collapseAllDayExpand}
            />
          )}
        </div>
      </Card>
      <BoardScheduleEventForm
        initialValues={formValues}
        onClose={() => setFormOpened(false)}
        onDelete={
          formValues?.blockId === undefined
            ? undefined
            : async () => {
                await onRemoveBlock({
                  blockId: formValues.blockId as BoardScheduleBlock["_id"],
                });
                setFormOpened(false);
              }
        }
        onSubmit={async (values) => {
          const blockId =
            values.blockId ??
            editingBlockIdRef.current ??
            (formValues?.blockId as BoardScheduleBlock["_id"] | undefined);
          const payload = {
            color: values.color,
            endAt: dateToScheduleInstant(values.end),
            startAt: dateToScheduleInstant(values.start),
          };
          if (blockId === undefined) {
            await onCreateBlock({
              ...payload,
              rowId: values.rowId as BoardRow["_id"],
            });
            return;
          }
          await onUpdateBlock({
            blockId: blockId as BoardScheduleBlock["_id"],
            ...payload,
          });
        }}
        opened={formOpened}
        rows={rows}
      />
    </>
  );
}
