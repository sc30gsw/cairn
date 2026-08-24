import { ActionIcon, Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import { addDaysJst, type DateJst } from "~domain/jst";

import { weekRangeLabel } from "~/features/review/lib/weekly-review-labels";
import { NUMERAL_FONT } from "~/lib/theme";

type WeeklyReviewWeekNavProps = {
  currentWeekStart: DateJst;
  onWeekChange: (weekStart: DateJst) => void;
  weekEnd: string;
  weekStart: DateJst;
};

//? 週単位の移動に日ピッカーは過剰。◀ ▶ +「今週へ」で足りる
export function WeeklyReviewWeekNav({
  currentWeekStart,
  onWeekChange,
  weekEnd,
  weekStart,
}: WeeklyReviewWeekNavProps) {
  const isCurrentWeek = weekStart === currentWeekStart;

  return (
    <Group align="center" gap="xs" wrap="nowrap">
      <Tooltip label="前の週" withArrow>
        <ActionIcon
          aria-label="前の週"
          onClick={() => onWeekChange(addDaysJst(weekStart, -7))}
          variant="subtle"
        >
          <IconChevronLeft aria-hidden size={18} stroke={1.75} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="次の週" withArrow>
        {/*? disabled な ActionIcon には Tooltip が効かないので span で包む(既存実装と同じ回避) */}
        <Box component="span" display="inline-flex">
          <ActionIcon
            aria-label="次の週"
            disabled={isCurrentWeek}
            onClick={() => onWeekChange(addDaysJst(weekStart, 7))}
            variant="subtle"
          >
            <IconChevronRight aria-hidden size={18} stroke={1.75} />
          </ActionIcon>
        </Box>
      </Tooltip>
      <Text ff={NUMERAL_FONT} fw={500}>
        {weekRangeLabel(weekStart, weekEnd)}
      </Text>
      {isCurrentWeek ? (
        <Badge variant="light">今週</Badge>
      ) : (
        <Tooltip label="今週へ戻る" withArrow>
          <ActionIcon
            aria-label="今週へ戻る"
            onClick={() => onWeekChange(currentWeekStart)}
            variant="subtle"
          >
            <IconRefresh aria-hidden size={18} stroke={1.75} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
