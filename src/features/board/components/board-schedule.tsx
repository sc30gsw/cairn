import { Card } from "@mantine/core";
import { Schedule, type ScheduleEventData } from "@mantine/schedule";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { DateJst } from "~domain/jst";

import { BoardScheduleAllDayExpand } from "~/features/board/components/board-schedule-all-day-expand";
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
import {
  allDayEventsForDay,
  boardAllDayMoreDate,
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardScheduleBlockIds,
  isBoardAllDayMoreEvent,
  toBoardScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

import classes from "~/features/board/components/board-schedule.module.css";

const ALL_DAY_ROW_HEIGHT = "1.75rem";
const ALL_DAY_VISIBLE_ROWS = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;

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
  const [expandedAllDayDate, setExpandedAllDayDate] = useState<string | null>(null);
  const scheduleRootRef = useRef<HTMLDivElement>(null);
  const editableBlockIds = boardScheduleBlockIds(blocks);
  const baseEvents = toBoardScheduleEvents(dateJst, rows, checkpoint, blocks);
  const { events } = withAllDayOverflow(
    baseEvents,
    BOARD_ALL_DAY_VISIBLE_LIMIT,
    SCHEDULE_LABELS_JA.moreLabel ?? ((count) => `+${count}件`),
  );
  const expandedAllDayEvents =
    expandedAllDayDate === null ? [] : allDayEventsForDay(baseEvents, expandedAllDayDate);

  useEffect(() => {
    if (expandedAllDayDate === null) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      const root = scheduleRootRef.current;
      if (root === null || root.contains(event.target as Node)) {
        return;
      }
      setExpandedAllDayDate(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expandedAllDayDate]);

  function collapseAllDayExpand() {
    setExpandedAllDayDate(null);
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

  function handleEventClick(event: ScheduleEventData) {
    if (isBoardAllDayMoreEvent(event.id)) {
      setExpandedAllDayDate(boardAllDayMoreDate(event.id));
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
          } as CSSProperties
        }
      >
        <div ref={scheduleRootRef}>
          <Schedule
            canDragEvent={(event) => editableBlockIds.has(String(event.id))}
            date={anchorDateJst}
            defaultView="week"
            events={events}
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
            renderEventBody={(event) =>
              isBoardAllDayMoreEvent(event.id) ? (
                <span data-board-all-day-more="true">{event.title}</span>
              ) : (
                event.title
              )
            }
            weekViewProps={{
              allDaySlotHeight: `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS})`,
              firstDayOfWeek: 1,
            }}
            withDragSlotSelect={rows.length > 0}
            withEventsDragAndDrop
          />
          {expandedAllDayDate === null ? null : (
            <BoardScheduleAllDayExpand
              dateJst={expandedAllDayDate}
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
          const payload = {
            color: values.color,
            endAt: dateToScheduleInstant(values.end),
            startAt: dateToScheduleInstant(values.start),
          };
          if (values.blockId === undefined) {
            await onCreateBlock({
              ...payload,
              rowId: values.rowId as BoardRow["_id"],
            });
            return;
          }
          await onUpdateBlock({
            blockId: values.blockId as BoardScheduleBlock["_id"],
            ...payload,
          });
        }}
        opened={formOpened}
        rows={rows}
      />
    </>
  );
}
