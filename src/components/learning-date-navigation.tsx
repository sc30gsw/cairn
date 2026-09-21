import { ActionIcon, Box, Group, Input, Tooltip } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { addDaysJst, compareDateJst, type DateJst } from "~domain/jst";

import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { learningDatePickerProps } from "~/lib/learning-date-picker-props";
import { cn } from "~/lib/utils";

import classes from "~/lib/learning-date-input.module.css";

type LearningDateNavigationTooltipLabels = {
  next?: string;
  prev?: string;
  today?: string;
};

type LearningDateNavigationProps = {
  centered?: boolean;
  dateJst: DateJst;
  linkSlot?: ReactNode;
  maxDateJst?: DateJst;
  onDateChange: (dateJst: DateJst) => void;
  onGoToToday: () => void;
  todayJst: DateJst;
  tooltipLabels?: LearningDateNavigationTooltipLabels;
};

export function LearningDateNavigation({
  centered = false,
  dateJst,
  linkSlot,
  maxDateJst,
  onDateChange,
  onGoToToday,
  todayJst,
  tooltipLabels,
}: LearningDateNavigationProps) {
  const isToday = dateJst === todayJst;
  const lastSelectableDateJst = maxDateJst ?? todayJst;
  const prevTooltip = tooltipLabels?.prev ?? "前の日";
  const nextTooltip = tooltipLabels?.next ?? "次の日";
  const todayTooltip = tooltipLabels?.today ?? "今日へ戻る";

  const pickDate = (next: string) => {
    if (compareDateJst(next, lastSelectableDateJst) <= 0) {
      onDateChange(next);
    }
  };

  return (
    <Box className={cn(centered && classes.learningDateNavigationCentered)}>
      <Input.Wrapper label="学習日">
        <Box className={classes.learningDateControls} mt={4}>
          <Group align="center" className={classes.learningDatePickerRow} gap={4} wrap="nowrap">
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
              w="fit-content"
              {...learningDatePickerProps(todayJst, lastSelectableDateJst)}
            />
            <Group align="center" gap={4} wrap="nowrap">
              <Tooltip label={prevTooltip} withArrow>
                <ActionIcon
                  aria-label={prevTooltip}
                  onClick={() => onDateChange(addDaysJst(dateJst, -1))}
                  size="input-sm"
                  variant="subtle"
                >
                  <IconChevronLeft aria-hidden size={18} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={nextTooltip} withArrow>
                <Box component="span" display="inline-flex">
                  <ActionIcon
                    aria-label={nextTooltip}
                    disabled={compareDateJst(dateJst, lastSelectableDateJst) >= 0}
                    onClick={() => onDateChange(addDaysJst(dateJst, 1))}
                    size="input-sm"
                    variant="subtle"
                  >
                    <IconChevronRight aria-hidden size={18} stroke={1.75} />
                  </ActionIcon>
                </Box>
              </Tooltip>
              {isToday ? null : (
                <Tooltip label={todayTooltip} withArrow>
                  <ActionIcon
                    aria-label={todayTooltip}
                    onClick={onGoToToday}
                    size="input-sm"
                    variant="subtle"
                  >
                    <IconRefresh aria-hidden size={18} stroke={1.75} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
          {linkSlot ? <Box className={classes.learningDateLinkCell}>{linkSlot}</Box> : null}
        </Box>
      </Input.Wrapper>
    </Box>
  );
}
