import { Card, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Schedule, type ScheduleProps, type DateStringValue } from "@mantine/schedule";
import { Result } from "better-result";
import type { CSSProperties, MouseEvent } from "react";
import { useId, useRef, useState } from "react";
import { addDaysJst, mondayOfWeek } from "~domain/jst";

import { BoardScheduleAllDayExpand } from "~/features/board/components/board-schedule-all-day-expand";
import { boardScheduleAllDayRenderEvent } from "~/features/board/components/board-schedule-all-day-render-event";
import { createBoardScheduleDayAllDayRenderEvent } from "~/features/board/components/board-schedule-day-all-day-render-event";
import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import { renderBoardScheduleEvent } from "~/features/board/components/board-schedule-event-source";
import { BoardScheduleExternalModal } from "~/features/board/components/board-schedule-external-modal";
import { BoardScheduleNavigation } from "~/features/board/components/board-schedule-navigation";
import { BoardScheduleYearDayPopover } from "~/features/board/components/board-schedule-year-day-popover";
import { useBoardScheduleActions } from "~/features/board/hooks/use-board-schedule-actions";
import { useBoardScheduleInteractions } from "~/features/board/hooks/use-board-schedule-interactions";
import { useBoardScheduleUi } from "~/features/board/hooks/use-board-schedule-ui";
import type { BoardViewState } from "~/features/board/hooks/use-board-view";
import { BOARD_ALL_DAY_VISIBLE_LIMIT } from "~/features/board/lib/board-schedule-events";
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
  firstDayOfWeek: 1,
  eventDragInterval: 15,
  eventResizeInterval: 15,
  renderEvent: boardScheduleAllDayRenderEvent,
} as const satisfies ScheduleProps["weekViewProps"];

const BOARD_MONTH_VIEW_PROPS = {
  ...BOARD_SCHEDULE_WITHOUT_HEADER,
  firstDayOfWeek: 1,
  maxEventsPerDay: BOARD_MONTH_MAX_EVENTS_PER_DAY,
  renderEvent: renderBoardScheduleEvent,
} as const satisfies ScheduleProps["monthViewProps"];

type BoardScheduleProps = {
  blocks: readonly BoardScheduleBlock[];
  externals?: readonly BoardExternalEvent[];
  pending?: boolean;
  rows: readonly BoardRow[];
  view: BoardViewState;
};

type BoardScheduleActions = ReturnType<typeof useBoardScheduleActions>;
type BoardScheduleUi = ReturnType<typeof useBoardScheduleUi>;
type BoardScheduleDialogsProps = {
  actions: BoardScheduleActions;
  pending: boolean;
  rows: readonly BoardRow[];
  ui: BoardScheduleUi;
};

function BoardScheduleDialogs({ actions, pending, rows, ui }: BoardScheduleDialogsProps) {
  return (
    <>
      <BoardScheduleExternalModal
        external={ui.openedExternal}
        onClose={ui.closeExternal}
        onRemove={(externalId) => actions.onRemoveExternal({ externalId })}
        onUpdate={(values) => {
          if (ui.openedExternal === null) throw new Error("外部予定が選択されていません");
          return actions.onMoveExternal({
            externalId: ui.openedExternal._id,
            title: values.title,
            colorId: values.colorId,
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
                  const result = await actions.onRemoveBlock({ blockId });
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
              return await actions.onCreateBlock({
                ...payload,
                rowId: values.rowId,
              });
            }
            return await actions.onUpdateBlock({
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
  const [openedYearDay, setOpenedYearDay] = useState<DateStringValue | null>(null);
  const yearDayTriggerRef = useRef<HTMLButtonElement | null>(null);
  const yearPopoverId = useId();
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
    moreEventsProps: { mode: "static" },
    eventDragInterval: 15,
    eventResizeInterval: 15,
    renderEvent: dayAllDayRenderEvent,
    withAllDaySlot: ui.dayAllDayEvents.length > 0,
  } as const satisfies ScheduleProps["dayViewProps"];

  const interactionProps = useBoardScheduleInteractions({
    actions: { onMoveBlock, onMoveExternal },
    blocks,
    canCreate: rows.length > 0,
    externals,
    isCompact,
    pending,
    ui,
  });

  function handleDayClick(day: DateStringValue, event: MouseEvent<HTMLButtonElement>) {
    if (scheduleView === "year") {
      yearDayTriggerRef.current = event.currentTarget;
      setOpenedYearDay((current) => (current === day ? null : day));
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
    firstDayOfWeek: 1,
    getDayProps: (day) => ({
      ...calendarDayProps(day),
      "aria-controls": openedYearDay === day ? `${yearPopoverId}-${day}-dropdown` : undefined,
      "aria-expanded": openedYearDay === day,
      "aria-haspopup": "dialog",
    }),
    withOutsideDays: false,
    renderDay: (date, dayEvents) => (
      <BoardScheduleYearDayPopover
        baseEvents={ui.baseEvents}
        canAdd={rows.length > 0}
        clickableEventIds={ui.clickableEventIds}
        dateJst={date}
        dayEvents={dayEvents}
        selected={openedYearDay === date}
        popoverId={`${yearPopoverId}-${date}`}
        onClose={() => {
          setOpenedYearDay(null);
          yearDayTriggerRef.current?.focus();
        }}
        onAdd={(day) => {
          ui.openCreate(`${day} ${DEFAULT_DAY_BLOCK_START}`, `${day} ${DEFAULT_DAY_BLOCK_END}`);
        }}
        onEditBlock={ui.openFromEvent}
      />
    ),
  } as const satisfies ScheduleProps["yearViewProps"];

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
              {...(scheduleView === "year" ? {} : interactionProps)}
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
      <BoardScheduleDialogs
        actions={{
          onCreateBlock,
          onMoveBlock,
          onMoveExternal,
          onRemoveBlock,
          onRemoveExternal,
          onUpdateBlock,
        }}
        pending={pending}
        rows={rows}
        ui={ui}
      />
    </>
  );
}
