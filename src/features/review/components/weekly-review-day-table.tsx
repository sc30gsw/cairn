import { Badge, EmptyState, Group, Progress, Stack, Table, Text, Title } from "@mantine/core";
import { IconCalendarWeek } from "@tabler/icons-react";

import { ConditionBadge } from "~/components/condition-badge";
import {
  digestCellLabel,
  monthDayLabel,
  weekdayShortLabel,
} from "~/features/review/lib/weekly-review-labels";
import type { WeeklyReview, WeeklyReviewDay } from "~/features/review/types/weekly-review";
import { calendarDayClassName } from "~/lib/calendar-day-style";
import { NUMERAL_FONT } from "~/lib/theme";

const KIND_TEXT = {
  rest: "休養",
  unrecorded: "未記録",
} as const;

//? バーは装飾。値は隣のテキストが担う(チャートだけで数値を伝えない)
function MinutesCell({ day, maxMinutes }: { day: WeeklyReviewDay; maxMinutes: number }) {
  if (day.confirmedMinutes === 0) {
    const text = day.kind === "rest" || day.kind === "unrecorded" ? KIND_TEXT[day.kind] : "0分";
    return <Text c="dimmed">{text}</Text>;
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Progress
        aria-hidden
        color="orange.5"
        miw={64}
        //? スケールの基準はその週の最大確定分数。固定軸にせず週の中の山谷を見せる
        value={maxMinutes === 0 ? 0 : Math.round((day.confirmedMinutes / maxMinutes) * 100)}
        w="100%"
      />
      <Text ff={NUMERAL_FONT} style={{ whiteSpace: "nowrap" }}>
        {day.confirmedMinutes}分
      </Text>
    </Group>
  );
}

type WeeklyReviewDayTableProps = Pick<WeeklyReview, "byDay"> & {
  todayJst: string;
};

export function WeeklyReviewDayTable({ byDay, todayJst }: WeeklyReviewDayTableProps) {
  const maxMinutes = byDay.reduce((max, day) => Math.max(max, day.confirmedMinutes), 0);

  return (
    <Stack gap="sm">
      <Title order={3}>この週の流れ</Title>
      <Table.ScrollContainer minWidth={480}>
        <Table highlightOnHover striped="odd" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>曜日</Table.Th>
              <Table.Th>日付</Table.Th>
              <Table.Th>学習量</Table.Th>
              <Table.Th>コンディション</Table.Th>
              <Table.Th>消化</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {byDay.map((day) => (
              <Table.Tr key={day.dateJst}>
                {/*? 土=青 / 日=赤 / 祝日 は既存の calendar-day-style のクラスを流用(新色を作らない) */}
                <Table.Td className={calendarDayClassName(day.dateJst) ?? undefined}>
                  {weekdayShortLabel(day.dateJst)}
                </Table.Td>
                <Table.Td ff={NUMERAL_FONT}>
                  <Group gap={6} wrap="nowrap">
                    {monthDayLabel(day.dateJst)}
                    {day.dateJst === todayJst ? (
                      <Badge size="xs" variant="light">
                        今日
                      </Badge>
                    ) : null}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <MinutesCell day={day} maxMinutes={maxMinutes} />
                </Table.Td>
                <Table.Td>
                  {day.condition === null ? (
                    <Text c="dimmed">—</Text>
                  ) : (
                    <ConditionBadge condition={day.condition} />
                  )}
                </Table.Td>
                <Table.Td ff={NUMERAL_FONT}>{digestCellLabel(day, todayJst)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {maxMinutes === 0 ? (
        <EmptyState
          description="この週はまだ確定した記録がありません。"
          icon={<IconCalendarWeek aria-hidden />}
          title="この週の記録はありません"
        />
      ) : null}
    </Stack>
  );
}
