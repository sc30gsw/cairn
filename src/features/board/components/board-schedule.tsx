import { Card, Stack } from "@mantine/core";
import {
  Schedule,
  type DateStringValue,
  type ScheduleEventData,
  type ScheduleViewLevel,
} from "@mantine/schedule";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { DateJst } from "~domain/jst";

import {
  BoardScheduleAllDayExpand,
  type BoardScheduleAllDayExpandAnchor,
} from "~/features/board/components/board-schedule-all-day-expand";
import {
  blockFormValues,
  BoardScheduleEventForm,
  slotFormValues,
} from "~/features/board/components/board-schedule-event-form";
import { BoardScheduleNavigation } from "~/features/board/components/board-schedule-navigation";
import type {
  BoardScheduleCreateInput,
  BoardScheduleMoveInput,
  BoardScheduleRemoveInput,
  BoardScheduleUpdateInput,
} from "~/features/board/hooks/board-mutations";
import { boardScheduleAllDayRenderEvent } from "~/features/board/lib/board-schedule-all-day-render-event";
import { createBoardScheduleDayAllDayRenderEvent } from "~/features/board/lib/board-schedule-day-all-day-render-event";
import {
  allDayEventsForDay,
  boardAllDayMoreDate,
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardScheduleBlockIds,
  isBoardAllDayMoreEvent,
  toBoardScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { createBoardScheduleYearRenderDay } from "~/features/board/lib/board-schedule-year-render-day";
import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

import classes from "~/features/board/components/board-schedule.module.css";

const ALL_DAY_ROW_HEIGHT = "1.25rem";
const ALL_DAY_VISIBLE_ROWS = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;
const ALL_DAY_GRID_GAP_PX = 2;
const ALL_DAY_GRID_PADDING_PX = 2;
const ALL_DAY_GRID_CHROME_PX =
  (ALL_DAY_VISIBLE_ROWS - 1) * ALL_DAY_GRID_GAP_PX + ALL_DAY_GRID_PADDING_PX * 2;
const DAY_VIEW_ALL_DAY_SLOT_HEIGHT = `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS} + ${ALL_DAY_GRID_CHROME_PX}px)`;
const BOARD_MONTH_MAX_EVENTS_PER_DAY = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;
const DEFAULT_DAY_BLOCK_START = "09:00:00";
const DEFAULT_DAY_BLOCK_END = "10:00:00";
const boardMoreLabel = (hiddenEventsCount: number) => `+${hiddenEventsCount}件`;

const BOARD_SCHEDULE_WITHOUT_HEADER = { withHeader: false as const };

const BOARD_WEEK_VIEW_PROPS = {
  ...BOARD_SCHEDULE_WITHOUT_HEADER,
  allDaySlotHeight: `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS})`,
  classNames: {
    weekViewAllDaySlots: classes.weekAllDaySlots,
    weekViewAllDaySlotsEvents: classes.weekAllDayEvents,
    weekViewAllDaySlotsList: classes.weekAllDaySlotsList,
  },
  firstDayOfWeek: 1 as const,
  renderEvent: boardScheduleAllDayRenderEvent,
};

const BOARD_MONTH_VIEW_PROPS = {
  ...BOARD_SCHEDULE_WITHOUT_HEADER,
  firstDayOfWeek: 1 as const,
  maxEventsPerDay: BOARD_MONTH_MAX_EVENTS_PER_DAY,
};

type BoardScheduleProps = {
  anchorDateJst: DateJst;
  blocks: readonly BoardScheduleBlock[];
  checkpoint: BoardMastery | null;
  dateJst: DateJst;
  monthDate: Date;
  onCreateBlock: (input: BoardScheduleCreateInput) => Promise<void>;
  onDateChange: (dateJst: DateJst) => void;
  onMonthChange: (yearMonth: string) => void;
  onMoveBlock: (input: BoardScheduleMoveInput) => Promise<void>;
  onRemoveBlock: (input: BoardScheduleRemoveInput) => Promise<void>;
  onScheduleViewChange: (view: ScheduleViewLevel) => void;
  onUpdateBlock: (input: BoardScheduleUpdateInput) => Promise<void>;
  onWeekChange: (weekAnchor: DateJst) => void;
  rows: readonly BoardRow[];
  scheduleView: ScheduleViewLevel;
  selectedDateJst: DateJst;
  todayJst: DateJst;
  weekAnchor: DateJst;
};

export function BoardSchedule({
  anchorDateJst,
  blocks,
  checkpoint,
  dateJst,
  monthDate,
  onCreateBlock,
  onDateChange,
  onMonthChange,
  onMoveBlock,
  onRemoveBlock,
  onScheduleViewChange,
  onUpdateBlock,
  onWeekChange,
  rows,
  scheduleView,
  selectedDateJst,
  todayJst,
  weekAnchor,
}: BoardScheduleProps) {
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<BoardScheduleEventInput | null>(null);
  const [expandedAllDayAnchor, setExpandedAllDayAnchor] =
    useState<BoardScheduleAllDayExpandAnchor | null>(null);
  const scheduleRootRef = useRef<HTMLDivElement>(null);
  const editableBlockIds = boardScheduleBlockIds(blocks);
  const baseEvents = toBoardScheduleEvents(dateJst, rows, checkpoint, blocks);
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

  const dayAllDayRenderEvent = createBoardScheduleDayAllDayRenderEvent({
    allDayEvents: dayAllDayEvents,
    limit: BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel,
    onEventClick: openEditFromEvent,
    onMoreClick: (target) => {
      openAllDayExpand(anchorDateJst, target);
    },
  });

  const dayViewProps = {
    ...BOARD_SCHEDULE_WITHOUT_HEADER,
    allDaySlotHeight: DAY_VIEW_ALL_DAY_SLOT_HEIGHT,
    classNames: {
      dayViewAllDay: classes.dayAllDayContainer,
      dayViewAllDayEvents: classes.dayAllDayEventsContainer,
    },
    moreEventsProps: { mode: "static" as const },
    renderEvent: dayAllDayRenderEvent,
    withAllDaySlot: dayAllDayEvents.length > 0,
  };

  function handleDayClick(day: DateStringValue) {
    if (scheduleView === "year") {
      return;
    }
    collapseAllDayExpand();
    if (rows.length === 0) {
      return;
    }
    openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
  }

  const yearViewProps = {
    ...BOARD_SCHEDULE_WITHOUT_HEADER,
    firstDayOfWeek: 1 as const,
    onDayClick: () => undefined,
    renderDay: createBoardScheduleYearRenderDay({
      baseEvents,
      canAdd: rows.length > 0,
      editableBlockIds,
      onAdd: (day) => {
        openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
      },
      onEditBlock: openEditFromEvent,
    }),
  };

  function handleEventClick(event: ScheduleEventData, clickEvent: MouseEvent<HTMLButtonElement>) {
    if (isBoardAllDayMoreEvent(event.id)) {
      openAllDayExpand(boardAllDayMoreDate(event.id), clickEvent.currentTarget);
      return;
    }
    collapseAllDayExpand();
    openEditFromEvent(event);
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
          } as CSSProperties
        }
      >
        <Stack gap="sm">
          <BoardScheduleNavigation
            monthDate={monthDate}
            onDateChange={onDateChange}
            onMonthChange={onMonthChange}
            onViewChange={onScheduleViewChange}
            onWeekChange={onWeekChange}
            scheduleView={scheduleView}
            selectedDateJst={selectedDateJst}
            todayJst={todayJst}
            weekAnchor={weekAnchor}
          />
          <div className={classes.boardScheduleRoot} data-view={scheduleView} ref={scheduleRootRef}>
            <Schedule
              canDragEvent={(event) => editableBlockIds.has(String(event.id))}
              date={anchorDateJst}
              events={scheduleEvents}
              labels={SCHEDULE_LABELS_JA}
              locale="ja"
              dayViewProps={dayViewProps}
              monthViewProps={BOARD_MONTH_VIEW_PROPS}
              onDayClick={handleDayClick}
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
              onViewChange={onScheduleViewChange}
              renderEventBody={(event) =>
                isBoardAllDayMoreEvent(event.id) ? (
                  <span data-board-all-day-more="true">{event.title}</span>
                ) : (
                  event.title
                )
              }
              view={scheduleView}
              weekViewProps={BOARD_WEEK_VIEW_PROPS}
              yearViewProps={yearViewProps}
              withDragSlotSelect={rows.length > 0}
              withEventsDragAndDrop
            />
            {expandedAllDayAnchor === null ? null : (
              <BoardScheduleAllDayExpand
                anchor={expandedAllDayAnchor}
                editableBlockIds={editableBlockIds}
                events={expandedAllDayEvents}
                onEventClick={openEditFromEvent}
              />
            )}
          </div>
        </Stack>
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
            values.blockId ?? (formValues?.blockId as BoardScheduleBlock["_id"] | undefined);
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
            rowId: values.rowId as BoardRow["_id"],
            ...payload,
          });
        }}
        opened={formOpened}
        rows={rows}
      />
    </>
  );
}
