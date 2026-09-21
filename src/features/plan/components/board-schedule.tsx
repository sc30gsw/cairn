import { Card, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Schedule, type ScheduleProps, type DateStringValue } from "@mantine/schedule";
import { Result } from "better-result";
import type { CSSProperties, MouseEvent } from "react";
import { useId, useRef, useState } from "react";
import { addDaysJst, mondayOfWeek } from "~domain/jst";

import { BoardScheduleAllDayExpand } from "~/features/plan/components/board-schedule-all-day-expand";
import { boardScheduleAllDayRenderEvent } from "~/features/plan/components/board-schedule-all-day-render-event";
import { createBoardScheduleDayAllDayRenderEvent } from "~/features/plan/components/board-schedule-day-all-day-render-event";
import { BoardScheduleEventForm } from "~/features/plan/components/board-schedule-event-form";
import { renderBoardScheduleEvent } from "~/features/plan/components/board-schedule-event-source";
import { BoardScheduleExternalModal } from "~/features/plan/components/board-schedule-external-modal";
import { BoardScheduleNavigation } from "~/features/plan/components/board-schedule-navigation";
import { BoardScheduleYearDayPopover } from "~/features/plan/components/board-schedule-year-day-popover";
import { useBoardScheduleActions } from "~/features/plan/hooks/use-board-schedule-actions";
import { useBoardScheduleInteractions } from "~/features/plan/hooks/use-board-schedule-interactions";
import { useBoardScheduleUi } from "~/features/plan/hooks/use-board-schedule-ui";
import type { PlanViewState } from "~/features/plan/hooks/use-plan-view";
import { BOARD_ALL_DAY_VISIBLE_LIMIT } from "~/features/plan/lib/board-schedule-events";
import {
  ALL_DAY_ROW_HEIGHT,
  ALL_DAY_VISIBLE_ROWS,
  BOARD_SCHEDULE_WITHOUT_HEADER,
  DEFAULT_DAY_BLOCK_END,
  DEFAULT_DAY_BLOCK_START,
  DAY_VIEW_ALL_DAY_SLOT_HEIGHT,
  BOARD_MONTH_MAX_EVENTS_PER_DAY,
} from "~/features/plan/lib/board-schedule-layout";
import { dateToScheduleInstant } from "~/features/plan/lib/schedule-instant";
import type {
  PlanCatalogItem,
  PlanExternalEvent,
  PlanScheduleBlock,
} from "~/features/plan/types/plan";
import {
  calendarDayProps,
  calendarDayStyleClasses,
  calendarDayColor,
} from "~/lib/calendar-day-style";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";
import { cn } from "~/lib/utils";

import classes from "~/features/plan/components/board-schedule.module.css";

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
  blocks: readonly PlanScheduleBlock[];
  externals?: readonly PlanExternalEvent[];
  items: readonly PlanCatalogItem[];
  pending?: boolean;
  view: PlanViewState;
};

type BoardScheduleActions = ReturnType<typeof useBoardScheduleActions>;
type BoardScheduleUi = ReturnType<typeof useBoardScheduleUi>;
type BoardScheduleDialogsProps = {
  actions: BoardScheduleActions;
  blocks: readonly PlanScheduleBlock[];
  dateJst: string;
  items: readonly PlanCatalogItem[];
  pending: boolean;
  ui: BoardScheduleUi;
};

function BoardScheduleDialogs({
  actions,
  blocks,
  dateJst,
  items,
  pending,
  ui,
}: BoardScheduleDialogsProps) {
  const editingId = ui.formValues?.eventId;
  const editing =
    editingId === undefined ? undefined : blocks.find((block) => block._id === editingId);
  return (
    <>
      <BoardScheduleExternalModal
        external={ui.openedExternal}
        onClose={ui.closeExternal}
        onRemove={(externalId) => actions.onRemoveExternal({ externalId })}
        onUpdate={(values) => {
          if (ui.openedExternal === null) throw new Error("外部予定が選択されていません");
          return actions.onMoveExternal({
            colorId: values.colorId,
            endAt: dateToScheduleInstant(values.end),
            externalId: ui.openedExternal._id,
            startAt: dateToScheduleInstant(values.start),
            title: values.title,
          });
        }}
      />
      {pending ? null : (
        <BoardScheduleEventForm
          dateJst={
            ui.formValues === null
              ? dateJst
              : (dateToScheduleInstant(ui.formValues.start).slice(0, 10) as typeof dateJst)
          }
          frozen={editing?.frozen === true}
          initialValues={ui.formValues}
          items={items}
          onClose={() => ui.setFormOpened(false)}
          onDelete={
            editingId === undefined
              ? undefined
              : async () => {
                  const result = await actions.onRemoveBlock({ eventId: editingId });
                  if (Result.isOk(result)) ui.setFormOpened(false);
                  return result;
                }
          }
          onSubmit={async (values) => {
            if (values.eventId === undefined && ui.formValues?.eventId === undefined) {
              return await actions.onCreateBlock(values);
            }
            return await actions.onUpdateBlock({
              ...values,
              eventId: values.eventId ?? ui.formValues?.eventId,
            });
          }}
          opened={ui.formOpened}
        />
      )}
    </>
  );
}

export function BoardSchedule({
  blocks,
  externals = [],
  items,
  pending = false,
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
  } = useBoardScheduleActions();
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
    scheduleRootRef,
    scheduleView,
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
    canCreate: true,
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
        canAdd
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
        blocks={blocks}
        dateJst={anchorDateJst}
        items={items}
        pending={pending}
        ui={ui}
      />
    </>
  );
}
