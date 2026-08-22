import { ActionIcon, Box, Group, Input, Text, Tooltip } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import { addDaysJst, isFutureDateJst } from "~domain/jst";

import { DayEditCrossLink } from "~/components/board-day-cross-links";
import { sharedDatePickerProps } from "~/features/board/components/board-schedule-navigation-shared";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { calendarDayStyleClasses } from "~/lib/calendar-day-style";

import classes from "~/lib/learning-date-input.module.css";

export function BoardKanbanDateNavigation() {
  const { selectedDateJst, setDate, today } = useBoardView();
  const isToday = selectedDateJst === today;

  return (
    <Group align="flex-end" gap="md" justify="space-between" mb="md" wrap="wrap">
      <Input.Wrapper label="学習日">
        <Group align="center" gap={4} mt={4} wrap="nowrap">
          <DatePickerInput
            aria-label="学習日"
            classNames={{
              input: classes.learningDateInput,
              month: calendarDayStyleClasses.japaneseCalendar,
            }}
            onChange={(value) => {
              if (typeof value === "string" && !isFutureDateJst(value, today)) {
                setDate(value);
              }
            }}
            value={selectedDateJst}
            valueFormat="YYYY-MM-DD"
            w="fit-content"
            {...sharedDatePickerProps(today)}
          />
          <Tooltip label="前の日" withArrow>
            <ActionIcon
              aria-label="前の日"
              onClick={() => setDate(addDaysJst(selectedDateJst, -1))}
              size="input-sm"
              variant="subtle"
            >
              <IconChevronLeft aria-hidden size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="次の日" withArrow>
            <Box component="span" display="inline-flex">
              <ActionIcon
                aria-label="次の日"
                disabled={selectedDateJst >= today}
                onClick={() => setDate(addDaysJst(selectedDateJst, 1))}
                size="input-sm"
                variant="subtle"
              >
                <IconChevronRight aria-hidden size={18} stroke={1.75} />
              </ActionIcon>
            </Box>
          </Tooltip>
          {isToday ? null : (
            <Tooltip label="今日へ戻る" withArrow>
              <ActionIcon
                aria-label="今日へ戻る"
                onClick={() => setDate(today)}
                size="input-sm"
                variant="subtle"
              >
                <IconRefresh aria-hidden size={18} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Input.Wrapper>
      <Text c="dimmed" size="sm">
        <DayEditCrossLink dateJst={selectedDateJst} todayJst={today} />
      </Text>
    </Group>
  );
}
