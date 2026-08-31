import { ActionIcon, Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import { addMonthsJst } from "~domain/jst";

import { yearMonthLabel } from "~/features/review/lib/monthly-review-labels";
import { NUMERAL_FONT } from "~/lib/theme";

type MonthlyReviewMonthNavProps = {
  currentYearMonth: string;
  onMonthChange: (yearMonth: string) => void;
  yearMonth: string;
};

export function MonthlyReviewMonthNav({
  currentYearMonth,
  onMonthChange,
  yearMonth,
}: MonthlyReviewMonthNavProps) {
  const isCurrentMonth = yearMonth === currentYearMonth;

  return (
    <Group align="center" gap="xs" wrap="nowrap">
      <Tooltip label="前の月" withArrow>
        <ActionIcon
          aria-label="前の月"
          onClick={() => onMonthChange(addMonthsJst(yearMonth, -1))}
          variant="subtle"
        >
          <IconChevronLeft aria-hidden size={18} stroke={1.75} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="次の月" withArrow>
        <Box component="span" display="inline-flex">
          <ActionIcon
            aria-label="次の月"
            disabled={isCurrentMonth}
            onClick={() => onMonthChange(addMonthsJst(yearMonth, 1))}
            variant="subtle"
          >
            <IconChevronRight aria-hidden size={18} stroke={1.75} />
          </ActionIcon>
        </Box>
      </Tooltip>
      <Text ff={NUMERAL_FONT} fw={500}>
        {yearMonthLabel(yearMonth)}
      </Text>
      {isCurrentMonth ? (
        <Badge variant="light">今月</Badge>
      ) : (
        <Tooltip label="今月へ戻る" withArrow>
          <ActionIcon
            aria-label="今月へ戻る"
            onClick={() => onMonthChange(currentYearMonth)}
            variant="subtle"
          >
            <IconRefresh aria-hidden size={18} stroke={1.75} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
