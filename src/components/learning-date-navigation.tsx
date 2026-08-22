import { ActionIcon, Box, Group, Input, Tooltip } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { addDaysJst, isFutureDateJst, type DateJst } from "~domain/jst";

import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { learningDatePickerProps } from "~/lib/learning-date-picker-props";

import classes from "~/lib/learning-date-input.module.css";

type LearningDateNavigationProps = {
  dateJst: DateJst;
  linkSlot?: ReactNode;
  onDateChange: (dateJst: DateJst) => void;
  onGoToToday: () => void;
  todayJst: DateJst;
};

export function LearningDateNavigation({
  dateJst,
  linkSlot,
  onDateChange,
  onGoToToday,
  todayJst,
}: LearningDateNavigationProps) {
  const isToday = dateJst === todayJst;

  const pickDate = (next: string) => {
    if (!isFutureDateJst(next, todayJst)) {
      onDateChange(next);
    }
  };

  return (
    <Group align="flex-end" gap="sm" wrap="wrap">
      <Input.Wrapper label="学習日">
        <Group align="center" gap={4} mt={4} wrap="nowrap">
          <DatePickerInput
            aria-label="学習日"
            classNames={{
              input: classes.learningDateInput,
              month: calendarDayStyleClasses.japaneseCalendar,
            }}
            miw={0}
            onChange={(value) => {
              if (typeof value === "string") {
                pickDate(value);
              }
            }}
            value={dateJst}
            valueFormat="YYYY-MM-DD"
            w="fit-content"
            {...learningDatePickerProps(todayJst)}
          />
          <Tooltip label="前の日" withArrow>
            <ActionIcon
              aria-label="前の日"
              onClick={() => onDateChange(addDaysJst(dateJst, -1))}
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
                disabled={dateJst >= todayJst}
                onClick={() => onDateChange(addDaysJst(dateJst, 1))}
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
                onClick={onGoToToday}
                size="input-sm"
                variant="subtle"
              >
                <IconRefresh aria-hidden size={18} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Input.Wrapper>
      {linkSlot}
    </Group>
  );
}
