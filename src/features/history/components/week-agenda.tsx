import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import { addDaysJst } from "~domain/jst";

import { WeeklyProgressCard } from "~/features/goals/components/weekly-progress-card";

import type { api } from "~/../convex/_generated/api";

type WeekPage = FunctionReturnType<typeof api.history.week>;
type WeekEvent = WeekPage["events"][number];

const STATUS_BADGE = {
  スキップ: { color: "yellow", label: "見送り" },
  未着手: { color: "gray", label: "未着手" },
  確定: { color: "blue", label: "完了" },
} as const satisfies Record<WeekEvent["status"], { color: string; label: string }>;

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

function formatDateHeader(dateJst: string): string {
  const date = new Date(`${dateJst}T12:00:00+09:00`);
  return DATE_HEADER_FORMATTER.format(date);
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00+09:00`);
  const end = new Date(`${weekEnd}T12:00:00+09:00`);
  const startLabel = WEEK_RANGE_START_FORMATTER.format(start);
  const endLabel = WEEK_RANGE_END_FORMATTER.format(end);
  return `${startLabel} 〜 ${endLabel}`;
}

function weekDates(weekStart: string): string[] {
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    dates.push(addDaysJst(weekStart, offset));
  }
  return dates;
}

function WeekEventRow({ event }: { event: WeekEvent }) {
  const badge = STATUS_BADGE[event.status];

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

export function WeekAgenda({
  todayJst,
  week,
}: {
  todayJst: string;
  week: WeekPage;
}) {
  const eventsByDate = new Map<string, WeekEvent[]>();
  for (const event of week.events) {
    const bucket = eventsByDate.get(event.dateJst) ?? [];
    bucket.push(event);
    eventsByDate.set(event.dateJst, bucket);
  }

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
            const dayEvents = eventsByDate.get(dateJst) ?? [];
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
