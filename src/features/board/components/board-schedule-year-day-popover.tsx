import {
  Badge,
  Box,
  Button,
  Divider,
  Popover,
  Stack,
  Text,
  UnstyledButton,
  getThemeColor,
  useMantineTheme,
} from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import { useRef, useState, type MouseEvent } from "react";

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
  const color = event.color ?? "gray";
  const timeLabel = `${formatScheduleTimeLabel(event.start)}–${formatScheduleTimeLabel(event.end)}`;
  const row = (
    <Box
      className={classes.yearPopoverEventRow}
      style={{
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-light-color)`,
      }}
    >
      <Text inherit lineClamp={2} size="sm">
        {event.title}
      </Text>
      <Text inherit opacity={0.85} size="xs">
        {timeLabel}
      </Text>
    </Box>
  );

  if (!editable) {
    return row;
  }

  return (
    <UnstyledButton
      className={classes.yearPopoverEventButton}
      onClick={(clickEvent) => {
        stopDayClick(clickEvent);
        onClose();
        onEditBlock(event);
      }}
      type="button"
    >
      {row}
    </UnstyledButton>
  );
}

type BoardScheduleYearDayPopoverProps = {
  baseEvents: readonly ScheduleEventData[];
  canAdd: boolean;
  dateJst: string;
  dayEvents: readonly ScheduleEventData[];
  editableBlockIds: ReadonlySet<string>;
  onAdd: (dateJst: string) => void;
  onEditBlock: (event: ScheduleEventData) => void;
};

export function BoardScheduleYearDayPopover({
  baseEvents,
  canAdd,
  dateJst,
  dayEvents,
  editableBlockIds,
  onAdd,
  onEditBlock,
}: BoardScheduleYearDayPopoverProps) {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  }

  return (
    <Popover
      closeOnClickOutside
      closeOnEscape
      onChange={setOpened}
      opened={opened}
      position="bottom"
      shadow="sm"
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
      <Popover.Dropdown onMouseEnter={openPopover} onMouseLeave={scheduleClose} p="sm">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {dateJst}
          </Text>
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
                <Badge
                  color={event.color ?? "gray"}
                  fullWidth
                  key={String(event.id)}
                  size="sm"
                  variant="light"
                >
                  {event.title}
                </Badge>
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
                  editable={editableBlockIds.has(String(event.id))}
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
