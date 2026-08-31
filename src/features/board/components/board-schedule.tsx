import { Card, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Schedule, type DateStringValue } from "@mantine/schedule";
import type { CSSProperties } from "react";
import { useRef } from "react";

import { BoardScheduleAllDayExpand } from "~/features/board/components/board-schedule-all-day-expand";
import { boardScheduleAllDayRenderEvent } from "~/features/board/components/board-schedule-all-day-render-event";
import { createBoardScheduleDayAllDayRenderEvent } from "~/features/board/components/board-schedule-day-all-day-render-event";
import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import { BoardScheduleNavigation } from "~/features/board/components/board-schedule-navigation";
import { createBoardScheduleYearRenderDay } from "~/features/board/components/board-schedule-year-render-day";
import { useBoardScheduleActions } from "~/features/board/hooks/use-board-schedule-actions";
import { useBoardScheduleUi } from "~/features/board/hooks/use-board-schedule-ui";
import type { BoardViewState } from "~/features/board/hooks/use-board-view";
import {
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  isBoardAllDayMoreEvent,
} from "~/features/board/lib/board-schedule-events";
import {
  ALL_DAY_ROW_HEIGHT,
  ALL_DAY_VISIBLE_ROWS,
  BOARD_SCHEDULE_WITHOUT_HEADER,
  DEFAULT_DAY_BLOCK_END,
  DEFAULT_DAY_BLOCK_START,
  DAY_VIEW_ALL_DAY_SLOT_HEIGHT,
  BOARD_MONTH_MAX_EVENTS_PER_DAY,
} from "~/features/board/lib/board-schedule-layout";
import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

import classes from "~/features/board/components/board-schedule.module.css";

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
  blocks: readonly BoardScheduleBlock[];
  pending?: boolean;
  rows: readonly BoardRow[];
  view: BoardViewState;
};

export function BoardSchedule({ blocks, pending = false, rows, view }: BoardScheduleProps) {
  const {
    monthDate,
    scheduleAnchor: anchorDateJst,
    scheduleView,
    selectedDateJst,
    setDate: onDateChange,
    setMonth: onMonthChange,
    resetMonthViewToToday: onMonthViewToday,
    setScheduleView: onScheduleViewChange,
    setWeek: onWeekChange,
    today: todayJst,
    weekAnchor,
  } = view;
  const { onCreateBlock, onMoveBlock, onRemoveBlock, onUpdateBlock } = useBoardScheduleActions(
    anchorDateJst,
    scheduleView,
  );
  const scheduleRootRef = useRef<HTMLDivElement | null>(null);
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });
  const ui = useBoardScheduleUi({
    anchorDateJst,
    blocks,
    rows,
    scheduleRootRef,
    todayJst,
  });

  const dayAllDayRenderEvent = createBoardScheduleDayAllDayRenderEvent({
    allDayEvents: ui.dayAllDayEvents,
    limit: BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel: ui.moreLabel,
    onEventClick: ui.openEditFromEvent,
    onMoreClick: (target) => {
      ui.openAllDayExpand(anchorDateJst, target);
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
    withAllDaySlot: ui.dayAllDayEvents.length > 0,
  };

  function handleDayClick(day: DateStringValue) {
    if (scheduleView === "year") {
      return;
    }
    ui.collapseAllDayExpand();
    if (rows.length === 0) {
      return;
    }
    ui.openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
  }

  const yearViewProps = {
    ...BOARD_SCHEDULE_WITHOUT_HEADER,
    firstDayOfWeek: 1 as const,
    onDayClick: () => undefined,
    renderDay: createBoardScheduleYearRenderDay({
      baseEvents: ui.baseEvents,
      canAdd: rows.length > 0,
      editableBlockIds: ui.editableBlockIds,
      onAdd: (day) => {
        ui.openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
      },
      onEditBlock: ui.openEditFromEvent,
    }),
  };

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
            onMonthViewToday={onMonthViewToday}
            onViewChange={onScheduleViewChange}
            onWeekChange={onWeekChange}
            scheduleView={scheduleView}
            selectedDateJst={selectedDateJst}
            todayJst={todayJst}
            weekAnchor={weekAnchor}
          />
          <div className={classes.boardScheduleRoot} data-view={scheduleView} ref={scheduleRootRef}>
            <Schedule
              canDragEvent={(event) => !pending && ui.editableBlockIds.has(String(event.id))}
              date={anchorDateJst}
              events={ui.scheduleEvents}
              labels={SCHEDULE_LABELS_JA}
              locale="ja"
              dayViewProps={dayViewProps}
              mode={pending ? "static" : "default"}
              monthViewProps={BOARD_MONTH_VIEW_PROPS}
              onDayClick={pending ? undefined : handleDayClick}
              onEventClick={pending ? undefined : ui.handleEventClick}
              onEventDrop={
                pending
                  ? undefined
                  : ({ eventId, newEnd, newStart }) => {
                      ui.collapseAllDayExpand();
                      if (!ui.editableBlockIds.has(String(eventId))) {
                        return;
                      }
                      void onMoveBlock({
                        blockId: eventId as BoardScheduleBlock["_id"],
                        endAt: newEnd,
                        startAt: newStart,
                      });
                    }
              }
              onSlotDragEnd={pending ? undefined : ui.openCreate}
              onTimeSlotClick={
                pending
                  ? undefined
                  : ({ slotEnd, slotStart }) => {
                      ui.openCreate(slotStart, slotEnd);
                    }
              }
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
              withDragSlotSelect={!pending && rows.length > 0 && !isCompact}
              withEventsDragAndDrop={!pending && !isCompact}
            />
            {ui.expandedAllDayAnchor === null ? null : (
              <BoardScheduleAllDayExpand
                anchor={ui.expandedAllDayAnchor}
                editableBlockIds={ui.editableBlockIds}
                events={ui.expandedAllDayEvents}
                onEventClick={ui.openEditFromEvent}
              />
            )}
          </div>
        </Stack>
      </Card>
      {pending ? null : (
        <BoardScheduleEventForm
          initialValues={ui.formValues}
          onClose={() => ui.setFormOpened(false)}
          onDelete={
            ui.formValues?.blockId === undefined
              ? undefined
              : async () => {
                  const blockId = ui.formValues?.blockId;
                  if (blockId === undefined) {
                    return;
                  }
                  await onRemoveBlock({ blockId });
                  ui.setFormOpened(false);
                }
          }
          onSubmit={async (values) => {
            const blockId = values.blockId ?? ui.formValues?.blockId;
            const payload = {
              color: values.color,
              endAt: dateToScheduleInstant(values.end),
              startAt: dateToScheduleInstant(values.start),
            };
            if (blockId === undefined) {
              await onCreateBlock({
                ...payload,
                rowId: values.rowId,
              });
              return;
            }
            await onUpdateBlock({
              blockId,
              rowId: values.rowId,
              ...payload,
            });
          }}
          opened={ui.formOpened}
          rows={rows}
        />
      )}
    </>
  );
}
