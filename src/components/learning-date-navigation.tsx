import { ActionIcon, Box, Group, Input, Tooltip } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { addDaysJst, isFutureDateJst, type DateJst } from "~domain/jst";

import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { learningDatePickerProps } from "~/lib/learning-date-picker-props";
import { cn } from "~/lib/utils";

import classes from "~/lib/learning-date-input.module.css";

type LearningDateNavigationProps = {
  centered?: boolean;
  dateJst: DateJst;
  linkSlot?: ReactNode;
  onDateChange: (dateJst: DateJst) => void;
  onGoToToday: () => void;
  todayJst: DateJst;
};

export function LearningDateNavigation({
  centered = false,
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
    <Box className={cn(centered && classes.learningDateNavigationCentered)}>
      <Input.Wrapper label="学習日">
        <Box className={classes.learningDateControls} mt={4}>
          <DatePickerInput
            aria-label="学習日"
            className={classes.learningDatePickerCell}
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
          <Group align="center" className={classes.learningDateNavCell} gap={4} wrap="nowrap">
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
          {linkSlot ? <Box className={classes.learningDateLinkCell}>{linkSlot}</Box> : null}
        </Box>
      </Input.Wrapper>
    </Box>
  );
}
