import { Card, Text, Title } from "@mantine/core";
import { AgendaView } from "@mantine/schedule";
import type { FunctionReturnType } from "convex/server";
import { addDaysJst } from "~domain/jst";

import type { api } from "~/../convex/_generated/api";

type WeekPage = FunctionReturnType<typeof api.history.week>;

export function WeekAgenda({ week }: Record<"week", WeekPage>) {
  return (
    <Card padding="lg" withBorder>
      <section aria-label="週の Agenda">
        <Title mb="sm" order={2}>
          週
        </Title>
        <Text mb="md">
          週間ゴール {week.weeklyGoalMinutes ?? "未設定"}分 / 実績 {week.volumeMinutes}分
        </Text>
        <AgendaView
          dateHeaderFormat="M月D日(ddd)"
          events={week.events.map((event, index) => ({
            color: "cyan",
            end: `${addDaysJst(event.dateJst, 1)} 00:00:00`,
            id: `${event.dateJst}-${event.title}-${index}`,
            start: `${event.dateJst} 00:00:00`,
            title: `${event.title}（${event.status} ${event.minutes}分）`,
          }))}
          headerFormat="YYYY年M月D日"
          locale="ja"
          mode="static"
          rangeEnd={week.weekEnd}
          rangeStart={week.weekStart}
        />
      </section>
    </Card>
  );
}
