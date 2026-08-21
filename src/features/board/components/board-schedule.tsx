import { Card } from "@mantine/core";
import { Schedule, type ScheduleEventData } from "@mantine/schedule";
import { useState } from "react";
import type { DateJst } from "~domain/jst";

import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import type {
  BoardScheduleCreateInput,
  BoardScheduleMoveInput,
  BoardScheduleRemoveInput,
  BoardScheduleUpdateInput,
} from "~/features/board/hooks/board-mutations";
import {
  boardScheduleBlockIds,
  toBoardScheduleEvents,
} from "~/features/board/lib/board-schedule-events";
import {
  dateToScheduleInstant,
  scheduleInstantToDate,
} from "~/features/board/lib/schedule-instant";
import type { BoardScheduleEventInput } from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

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

function blockFormValues(block: BoardScheduleBlock): BoardScheduleEventInput {
  return {
    blockId: block._id,
    color: block.color as BoardScheduleEventInput["color"],
    end: scheduleInstantToDate(block.endAt),
    start: scheduleInstantToDate(block.startAt),
    title: block.title,
  };
}

function slotFormValues(start: string, end: string): BoardScheduleEventInput {
  return {
    blockId: undefined,
    color: "blue",
    end: scheduleInstantToDate(end),
    start: scheduleInstantToDate(start),
    title: "",
  };
}

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
  const editableBlockIds = boardScheduleBlockIds(blocks);
  const events = toBoardScheduleEvents(dateJst, rows, checkpoint, blocks);

  function openCreate(start: string, end: string) {
    setFormValues(slotFormValues(start, end));
    setFormOpened(true);
  }

  function openEdit(block: BoardScheduleBlock) {
    setFormValues(blockFormValues(block));
    setFormOpened(true);
  }

  function handleEventClick(event: ScheduleEventData) {
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
          withDragSlotSelect
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
            title: values.title,
          };
          if (values.blockId === undefined) {
            await onCreateBlock(payload);
            return;
          }
          await onUpdateBlock({
            blockId: values.blockId as BoardScheduleBlock["_id"],
            ...payload,
          });
        }}
        opened={formOpened}
      />
    </>
  );
}
