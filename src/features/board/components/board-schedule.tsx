import { Card, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Schedule, type DateStringValue } from "@mantine/schedule";
import { Result } from "better-result";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { addDaysJst, mondayOfWeek } from "~domain/jst";

import { BoardScheduleAllDayExpand } from "~/features/board/components/board-schedule-all-day-expand";
import { boardScheduleAllDayRenderEvent } from "~/features/board/components/board-schedule-all-day-render-event";
import { createBoardScheduleDayAllDayRenderEvent } from "~/features/board/components/board-schedule-day-all-day-render-event";
import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import { BoardScheduleExternalModal } from "~/features/board/components/board-schedule-external-modal";
import { BoardScheduleNavigation } from "~/features/board/components/board-schedule-navigation";
import { createBoardScheduleYearRenderDay } from "~/features/board/components/board-schedule-year-render-day";
import { useBoardScheduleActions } from "~/features/board/hooks/use-board-schedule-actions";
import { useBoardScheduleUi } from "~/features/board/hooks/use-board-schedule-ui";
import type { BoardViewState } from "~/features/board/hooks/use-board-view";
import {
  BOARD_ALL_DAY_VISIBLE_LIMIT,
  boardExternalEventId,
  boardScheduleEventSourceId,
  movedScheduleRange,
  isBoardAllDayMoreEvent,
  isBoardExternalEvent,
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
import type {
  BoardExternalEvent,
  BoardRow,
  BoardScheduleBlock,
} from "~/features/board/types/board";
import {
  calendarDayProps,
  calendarDayStyleClasses,
  calendarDayColor,
} from "~/lib/calendar-day-style";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";
import { cn } from "~/lib/utils";

import classes from "~/features/board/components/board-schedule.module.css";

const BOARD_WEEK_VIEW_PROPS = {
  ...BOARD_SCHEDULE_WITHOUT_HEADER,
  allDaySlotHeight: `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS})`,
  classNames: {
    weekViewDayLabel: classes.weekDayLabel,
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
  externals?: readonly BoardExternalEvent[];
  pending?: boolean;
  rows: readonly BoardRow[];
  view: BoardViewState;
};

export function BoardSchedule({
  blocks,
  externals = [],
  pending = false,
  rows,
  view,
}: BoardScheduleProps) {
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
  const {
    onCreateBlock,
    onMoveBlock,
    onMoveExternal,
    onRemoveBlock,
    onRemoveExternal,
    onUpdateBlock,
  } = useBoardScheduleActions(anchorDateJst, scheduleView);
  const scheduleRootRef = useRef<HTMLDivElement | null>(null);
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });
  const ui = useBoardScheduleUi({
    anchorDateJst,
    blocks,
    externals,
    rows,
    scheduleRootRef,
    scheduleView,
    todayJst,
  });

  const dayAllDayRenderEvent = createBoardScheduleDayAllDayRenderEvent({
    allDayEvents: ui.dayAllDayEvents,
    limit: BOARD_ALL_DAY_VISIBLE_LIMIT,
    moreLabel: ui.moreLabel,
    onEventClick: ui.openFromEvent,
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
    getDayProps: calendarDayProps,
    onDayClick: () => undefined,
    renderDay: createBoardScheduleYearRenderDay({
      baseEvents: ui.baseEvents,
      canAdd: rows.length > 0,
      clickableEventIds: ui.clickableEventIds,
      onAdd: (day) => {
        ui.openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
      },
      onEditBlock: ui.openFromEvent,
    }),
  };

  return (
    <>
      <Card
        className={cn(classes.boardSchedule, calendarDayStyleClasses.japaneseCalendar)}
        padding="md"
        style={
          {
            ...Object.fromEntries(
              Array.from({ length: 7 }, (_, index) => [
                `--board-week-day-${index}`,
                calendarDayColor(addDaysJst(mondayOfWeek(anchorDateJst), index)) ?? "inherit",
              ]),
            ),
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
              {...(scheduleView === "year"
                ? {}
                : {
                    canDragEvent: (event) =>
                      !pending &&
                      (ui.editableBlockIds.has(boardScheduleEventSourceId(event.id)) ||
                        ui.editableExternalEventIds.has(boardScheduleEventSourceId(event.id))),
                    onEventClick: pending ? undefined : ui.handleEventClick,
                    onEventDrop: pending
                      ? undefined
                      : ({ event, eventId, newStart }) => {
                          ui.collapseAllDayExpand();
                          if (
                            ui.editableExternalEventIds.has(boardScheduleEventSourceId(eventId))
                          ) {
                            const external = externals.find(
                              (entry) => entry._id === boardExternalEventId(eventId),
                            );
                            if (external === undefined) {
                              return;
                            }
                            void onMoveExternal({
                              ...movedScheduleRange(external, event.start, newStart),
                              externalId: boardExternalEventId(eventId),
                            });
                            return;
                          }
                          const block = blocks.find(
                            (entry) => entry._id === boardScheduleEventSourceId(eventId),
                          );
                          if (block === undefined) {
                            return;
                          }
                          void onMoveBlock({
                            ...movedScheduleRange(block, event.start, newStart),
                            blockId: block._id,
                          });
                        },
                    onTimeSlotClick: pending
                      ? undefined
                      : ({ slotEnd, slotStart }) => {
                          ui.openCreate(slotStart, slotEnd);
                        },
                    onSlotDragEnd: pending ? undefined : ui.openCreate,
                    renderEventBody: (event) => {
                      if (isBoardAllDayMoreEvent(event.id)) {
                        return <span data-board-all-day-more="true">{event.title}</span>;
                      }
                      if (isBoardExternalEvent(event.id)) {
                        return <span data-board-external="true">{event.title}</span>;
                      }
                      return event.title;
                    },
                    withDragSlotSelect: !pending && rows.length > 0 && !isCompact,
                    withEventsDragAndDrop: !pending && !isCompact,
                  })}
              date={anchorDateJst}
              events={
                scheduleView === "day" || scheduleView === "week"
                  ? ui.scheduleEvents
                  : ui.baseEvents
              }
              labels={SCHEDULE_LABELS_JA}
              locale="ja"
              dayViewProps={dayViewProps}
              mode={pending ? "static" : "default"}
              monthViewProps={{ ...BOARD_MONTH_VIEW_PROPS, getDayProps: calendarDayProps }}
              onDayClick={pending ? undefined : handleDayClick}
              onViewChange={onScheduleViewChange}
              view={scheduleView}
              weekViewProps={BOARD_WEEK_VIEW_PROPS}
              yearViewProps={yearViewProps}
            />
            {ui.expandedAllDayAnchor === null ? null : (
              <BoardScheduleAllDayExpand
                anchor={ui.expandedAllDayAnchor}
                clickableEventIds={ui.clickableEventIds}
                events={ui.expandedAllDayEvents}
                onEventClick={ui.openFromEvent}
              />
            )}
          </div>
        </Stack>
      </Card>
      <BoardScheduleExternalModal
        external={ui.openedExternal}
        onClose={ui.closeExternal}
        onRemove={(externalId) => onRemoveExternal({ externalId })}
        onUpdate={(values) => {
          if (ui.openedExternal === null) throw new Error("外部予定が選択されていません");
          return onMoveExternal({
            externalId: ui.openedExternal._id,
            title: values.title,
            colorId: values.colorId === "calendar" ? null : values.colorId,
            startAt: dateToScheduleInstant(values.start),
            endAt: dateToScheduleInstant(values.end),
          });
        }}
      />
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
                  const result = await onRemoveBlock({ blockId });
                  if (Result.isOk(result)) ui.setFormOpened(false);
                  return result;
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
              return await onCreateBlock({
                ...payload,
                rowId: values.rowId,
              });
            }
            return await onUpdateBlock({
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
