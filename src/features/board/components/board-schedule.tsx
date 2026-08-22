import { Card } from "@mantine/core";
import { Schedule, type ScheduleEventData } from "@mantine/schedule";
import { useState } from "react";
import type { DateJst } from "~domain/jst";

import { BoardScheduleAllDayModal } from "~/features/board/components/board-schedule-all-day-modal";
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
  boardAllDayMoreDate,
  boardScheduleBlockIds,
  isBoardAllDayMoreEvent,
  toBoardScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

const ALL_DAY_VISIBLE_LIMIT = 2;

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
  const [allDayModalDate, setAllDayModalDate] = useState<string | null>(null);
  const editableBlockIds = boardScheduleBlockIds(blocks);
  const baseEvents = toBoardScheduleEvents(dateJst, rows, checkpoint, blocks);
  const { events, hiddenEventsByDay } = withAllDayOverflow(
    baseEvents,
    ALL_DAY_VISIBLE_LIMIT,
    SCHEDULE_LABELS_JA.moreLabel ?? ((count) => `+${count}件`),
  );
  const allDayModalEvents =
    allDayModalDate === null ? [] : (hiddenEventsByDay.get(allDayModalDate) ?? []);

  function openCreate(start: string, end: string) {
    const values = slotFormValues(rows, start, end);
    if (values === null) {
      return;
    }
    setFormValues(values);
    setFormOpened(true);
  }

  function openEdit(block: BoardScheduleBlock) {
    setFormValues(blockFormValues(block));
    setFormOpened(true);
  }

  function handleEventClick(event: ScheduleEventData) {
    if (isBoardAllDayMoreEvent(event.id)) {
      setAllDayModalDate(boardAllDayMoreDate(event.id));
      return;
    }
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
      <Card padding="md">
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
          weekViewProps={{ firstDayOfWeek: 1 }}
          withDragSlotSelect={rows.length > 0}
          withEventsDragAndDrop
        />
      </Card>
      <BoardScheduleEventForm
        initialValues={formValues}
        onClose={() => setFormOpened(false)}
        onDelete={
          formValues?.blockId === undefined
            ? undefined
            : () => {
                void onRemoveBlock({
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
      <BoardScheduleAllDayModal
        dateJst={allDayModalDate}
        events={allDayModalEvents}
        onClose={() => setAllDayModalDate(null)}
        opened={allDayModalDate !== null}
      />
    </>
  );
}
