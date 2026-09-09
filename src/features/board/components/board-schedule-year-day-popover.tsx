import {
  Badge,
  Box,
  Button,
  CloseButton,
  Divider,
  Group,
  Popover,
  Stack,
  Text,
  UnstyledButton,
  getThemeColor,
  useMantineTheme,
} from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { BoardScheduleEventSource } from "~/features/board/components/board-schedule-event-source";
import { boardScheduleEventColors } from "~/features/board/lib/board-schedule-color-ui";
import {
  allDayEventsForDay,
  isBoardAllDayMoreEvent,
  timedEventsForDay,
} from "~/features/board/lib/board-schedule-events";
import { formatScheduleTimeLabel } from "~/features/board/lib/schedule-instant";

import classes from "~/features/board/components/board-schedule.module.css";

function stopDayClick(event: MouseEvent) {
  event.stopPropagation();
}

type YearPopoverTimedEventProps = {
  editable: boolean;
  event: ScheduleEventData;
  onEditBlock: (event: ScheduleEventData) => void;
  onClose: () => void;
};

function YearPopoverTimedEvent({
  editable,
  event,
  onClose,
  onEditBlock,
}: YearPopoverTimedEventProps) {
  const theme = useMantineTheme();
  const timeLabel = `${formatScheduleTimeLabel(event.start)}–${formatScheduleTimeLabel(event.end)}`;
  const badge = (
    <Badge
      autoContrast
      c={boardScheduleEventColors({ ...event, theme }).color}
      color={event.color ?? "gray"}
      fullWidth
      size="sm"
      variant={event.variant ?? "light"}
    >
      {event.title} · {timeLabel}
    </Badge>
  );

  if (!editable) {
    return <BoardScheduleEventSource eventId={event.id}>{badge}</BoardScheduleEventSource>;
  }

  return (
    <BoardScheduleEventSource eventId={event.id}>
      <UnstyledButton
        onClick={(clickEvent) => {
          stopDayClick(clickEvent);
          onClose();
          onEditBlock(event);
        }}
        type="button"
      >
        {badge}
      </UnstyledButton>
    </BoardScheduleEventSource>
  );
}

type BoardScheduleYearDayPopoverProps = {
  baseEvents: readonly ScheduleEventData[];
  canAdd: boolean;
  dateJst: string;
  dayEvents: readonly ScheduleEventData[];
  clickableEventIds: ReadonlySet<string>;
  selected: boolean;
  popoverId: string;
  onClose: () => void;
  onAdd: (dateJst: string) => void;
  onEditBlock: (event: ScheduleEventData) => void;
};

export function BoardScheduleYearDayPopover({
  baseEvents,
  canAdd,
  dateJst,
  dayEvents,
  clickableEventIds,
  selected,
  popoverId,
  onClose,
  onAdd,
  onEditBlock,
}: BoardScheduleYearDayPopoverProps) {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);
  const allDayEvents = allDayEventsForDay(baseEvents, dateJst);
  const timedEvents = timedEventsForDay(baseEvents, dateJst);
  const indicatorEvents = dayEvents
    .filter((event) => !isBoardAllDayMoreEvent(event.id))
    .slice(0, 3);

  function clearCloseTimer() {
    if (closeTimerRef.current !== undefined) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }

  function openPopover() {
    clearCloseTimer();
    setOpened(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpened(false);
    }, 120);
  }

  function closePopover() {
    clearCloseTimer();
    setOpened(false);
    if (selected) onClose();
  }

  return (
    <Popover
      closeOnClickOutside
      closeOnEscape={false}
      id={popoverId}
      onDismiss={closePopover}
      opened={opened || selected}
      position="bottom"
      shadow="sm"
      trapFocus={selected}
      width={280}
      withArrow
    >
      <Popover.Target>
        <Box
          className={classes.yearDayTarget}
          component="span"
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
        >
          {Number(dateJst.slice(8, 10))}
          <Box className={classes.yearDayIndicators} component="span">
            {indicatorEvents.map((event) => (
              <Box
                bg={getThemeColor(event.color ?? "gray", theme)}
                className={classes.yearDayIndicator}
                component="span"
                key={String(event.id)}
              />
            ))}
          </Box>
        </Box>
      </Popover.Target>
      <Popover.Dropdown
        aria-labelledby={`${popoverId}-label`}
        onClick={stopDayClick}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closePopover();
          }
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        p="sm"
      >
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600} id={`${popoverId}-label`} size="sm">
              {dateJst}の予定
            </Text>
            <CloseButton aria-label="予定一覧を閉じる" onClick={closePopover} size="sm" />
          </Group>
          <Divider />
          <Text c="dimmed" size="xs">
            終日
          </Text>
          {allDayEvents.length === 0 ? (
            <Text c="dimmed" size="sm">
              なし
            </Text>
          ) : (
            <Stack gap={4}>
              {allDayEvents.map((event) => (
                <BoardScheduleEventSource eventId={event.id} key={String(event.id)}>
                  <Badge
                    autoContrast
                    c={boardScheduleEventColors({ ...event, theme }).color}
                    color={event.color ?? "gray"}
                    fullWidth
                    size="sm"
                    variant={event.variant ?? "light"}
                  >
                    {event.title}
                  </Badge>
                </BoardScheduleEventSource>
              ))}
            </Stack>
          )}
          <Divider />
          <Text c="dimmed" size="xs">
            予定
          </Text>
          {timedEvents.length === 0 ? (
            <Text c="dimmed" size="sm">
              なし
            </Text>
          ) : (
            <Stack gap={4}>
              {timedEvents.map((event) => (
                <YearPopoverTimedEvent
                  editable={clickableEventIds.has(String(event.id))}
                  event={event}
                  key={String(event.id)}
                  onClose={closePopover}
                  onEditBlock={onEditBlock}
                />
              ))}
            </Stack>
          )}
          <Button
            disabled={!canAdd}
            onClick={(clickEvent) => {
              stopDayClick(clickEvent);
              closePopover();
              onAdd(dateJst);
            }}
            size="xs"
            type="button"
            variant="light"
          >
            予定を追加
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
