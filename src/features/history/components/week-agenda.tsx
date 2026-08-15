import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import { addDaysJst } from "~domain/jst";

import type { api } from "~/../convex/_generated/api";

type WeekPage = FunctionReturnType<typeof api.history.week>;
type WeekEvent = WeekPage["events"][number];

const STATUS_BADGE = {
  スキップ: { color: "yellow", label: "見送り" },
  未着手: { color: "gray", label: "未着手" },
  確定: { color: "cyan", label: "完了" },
} as const satisfies Record<WeekEvent["status"], { color: string; label: string }>;

function formatDateHeader(dateJst: string): string {
  const date = new Date(`${dateJst}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(date);
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00+09:00`);
  const end = new Date(`${weekEnd}T12:00:00+09:00`);
  const startLabel = new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
  }).format(end);
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

export function WeekAgenda({ week }: Record<"week", WeekPage>) {
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
        <Group gap="md" mt="sm">
          <Text size="sm">
            週間ゴール{" "}
            <Text component="span" fw={600}>
              {week.weeklyGoalMinutes ?? "未設定"}分
            </Text>
          </Text>
          <Text size="sm">
            実績{" "}
            <Text component="span" fw={600}>
              {week.volumeMinutes}分
            </Text>
          </Text>
        </Group>
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
                    {dayEvents.map((event, index) => (
                      <WeekEventRow event={event} key={`${event.dateJst}-${event.title}-${index}`} />
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
