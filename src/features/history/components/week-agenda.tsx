import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { groupBy, prop } from "remeda";
import { addDaysJst, type DateJst } from "~domain/jst";

import { WeeklyProgressCard } from "~/components/weekly-progress-card";
import { RECORD_STATUS_UI } from "~/features/history/lib/record-status-label";
import type { WeekEvent, WeekPage } from "~/features/history/types/history";

const DATE_HEADER_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

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
  const date = new Date(`${dateJst}T12:00:00+09:00`);
  return DATE_HEADER_FORMATTER.format(date);
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
      <Text fw={500} lineClamp={1} size="sm">
        {event.title}
      </Text>
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

export function WeekAgenda({ todayJst, week }: { todayJst: DateJst; week: WeekPage }) {
  const eventsByDate = groupBy(week.events, prop("dateJst"));

  return (
    <Card>
      <section aria-label="週の Agenda">
        <Title order={2}>今週</Title>
        <Text c="dimmed" mt={4} size="sm">
          今日を含む週（{formatWeekRange(week.weekStart, week.weekEnd)}）
        </Text>
        <WeeklyProgressCard
          todayJst={todayJst}
          volumeMinutes={week.volumeMinutes}
          weekEndJst={week.weekEnd}
          weeklyGoalMinutes={week.weeklyGoalMinutes}
        />
        <Stack gap="lg" mt="lg">
          {weekDates(week.weekStart).map((dateJst) => {
            const dayEvents = eventsByDate[dateJst] ?? [];
            return (
              <Stack gap="xs" key={dateJst}>
                <Text fw={600} size="sm">
                  {formatDateHeader(dateJst)}
                </Text>
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
