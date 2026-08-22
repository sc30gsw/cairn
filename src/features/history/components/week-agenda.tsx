import { Anchor, Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { groupBy, prop } from "remeda";
import { addDaysJst, type DateJst } from "~domain/jst";

import { ConditionBadge } from "~/components/condition-badge";
import { TruncatedText } from "~/components/truncated-text";
import { formatJstDateLabel } from "~/features/history/lib/format-jst-date";
import { RECORD_STATUS_UI } from "~/features/history/lib/record-status-label";
import type { WeekEvent, WeekPage } from "~/features/history/types/history";

const WEEK_RANGE_START_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

const WEEK_RANGE_END_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tokyo",
});

function formatDateHeader(dateJst: DateJst): string {
  return formatJstDateLabel(dateJst);
}

function formatWeekRange(weekStart: DateJst, weekEnd: DateJst): string {
  const start = new Date(`${weekStart}T12:00:00+09:00`);
  const end = new Date(`${weekEnd}T12:00:00+09:00`);
  const startLabel = WEEK_RANGE_START_FORMATTER.format(start);
  const endLabel = WEEK_RANGE_END_FORMATTER.format(end);
  return `${startLabel} 〜 ${endLabel}`;
}

function weekDates(weekStart: DateJst): DateJst[] {
  const dates: DateJst[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    dates.push(addDaysJst(weekStart, offset));
  }
  return dates;
}

function WeekEventRow({ event }: { event: WeekEvent }) {
  const badge = RECORD_STATUS_UI[event.status];

  return (
    <Group gap="sm" justify="space-between" wrap="nowrap">
      <TruncatedText fw={500} lineClamp={1} size="sm">
        {event.title}
      </TruncatedText>
      <Group gap="xs" wrap="nowrap">
        <Badge color={badge.color} variant="light">
          {badge.label}
        </Badge>
        <Text c="dimmed" size="sm" ta="right" w={48}>
          {event.minutes}分
        </Text>
      </Group>
    </Group>
  );
}

export function WeekAgenda({ week }: { week: WeekPage }) {
  const eventsByDate = groupBy(week.events, prop("dateJst"));
  const dayByDate = new Map(week.days.map((day) => [day.dateJst, day] as const));

  return (
    <Card>
      <section aria-label="週の Agenda">
        <Title order={2}>今週</Title>
        <Text c="dimmed" mt={4} size="sm">
          今日を含む週（{formatWeekRange(week.weekStart, week.weekEnd)}）
        </Text>
        <Stack gap="lg" mt="lg">
          {weekDates(week.weekStart).map((dateJst) => {
            const dayEvents = eventsByDate[dateJst] ?? [];
            const day = dayByDate.get(dateJst);
            const condition = day?.condition ?? null;
            const memo = day?.memo ?? null;
            return (
              <Stack gap="xs" key={dateJst}>
                <Group align="flex-start" gap="xs" wrap="wrap">
                  <Anchor
                    fw={600}
                    renderRoot={(props) => (
                      <Link {...props} params={{ dateJst }} to="/days/$dateJst" />
                    )}
                    size="sm"
                    underline="hover"
                  >
                    {formatDateHeader(dateJst)}
                  </Anchor>
                  {condition === null ? null : <ConditionBadge condition={condition} />}
                </Group>
                {memo === null || memo.length === 0 ? null : (
                  <TruncatedText c="dimmed" lineClamp={2} pl="sm" size="sm">
                    {memo}
                  </TruncatedText>
                )}
                {dayEvents.length === 0 ? (
                  <Text c="dimmed" pl="sm" size="sm">
                    記録なし
                  </Text>
                ) : (
                  <Stack gap="xs" pl="sm">
                    {dayEvents.map((event) => (
                      <WeekEventRow event={event} key={event.rowId} />
                    ))}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
      </section>
    </Card>
  );
}
