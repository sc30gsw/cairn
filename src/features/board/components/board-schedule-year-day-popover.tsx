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

function formatScheduleTime(value: string | Date): string {
  const instant = typeof value === "string" ? value : "";
  return instant.slice(11, 16);
}

function stopDayClick(event: MouseEvent) {
  event.stopPropagation();
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
          component="span"
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          style={{ display: "block", height: "100%", width: "100%" }}
        >
          {Number(dateJst.slice(8, 10))}
          <Box component="span" display="flex" mt={2}>
            {indicatorEvents.map((event) => (
              <Box
                bg={getThemeColor(event.color ?? "gray", theme)}
                bdrs={999}
                h={4}
                key={String(event.id)}
                mr={2}
                w={4}
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
              {timedEvents.map((event) => {
                const editable = editableBlockIds.has(String(event.id));
                const timeLabel = `${formatScheduleTime(event.start)}–${formatScheduleTime(event.end)}`;
                const label = (
                  <Stack gap={0}>
                    <Text inherit lineClamp={1} size="sm">
                      {event.title}
                    </Text>
                    <Text c="dimmed" inherit size="xs">
                      {timeLabel}
                    </Text>
                  </Stack>
                );

                if (!editable) {
                  return (
                    <Badge
                      color={event.color ?? "gray"}
                      fullWidth
                      key={String(event.id)}
                      size="sm"
                      variant="light"
                    >
                      {label}
                    </Badge>
                  );
                }

                return (
                  <UnstyledButton
                    className="bg-gray-1 hover:bg-gray-2 w-full rounded-sm px-2 py-1 text-left"
                    key={String(event.id)}
                    onClick={(clickEvent) => {
                      stopDayClick(clickEvent);
                      setOpened(false);
                      onEditBlock(event);
                    }}
                    type="button"
                  >
                    <Badge color={event.color ?? "gray"} fullWidth size="sm" variant="light">
                      {label}
                    </Badge>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
          <Button
            disabled={!canAdd}
            onClick={(clickEvent) => {
              stopDayClick(clickEvent);
              setOpened(false);
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
