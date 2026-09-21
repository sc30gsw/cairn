import { convexQuery } from "@convex-dev/react-query";
import { Button, Card, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Result } from "better-result";
import { useState } from "react";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import { api } from "~/../convex/_generated/api";
import { ObstacleSection } from "~/components/obstacle-section";
import { PlanGoalsReadCard } from "~/components/plan-goals-read-card";
import {
  BoardScheduleEventForm,
  eventFormValues,
  slotFormValues,
} from "~/features/plan/components/board-schedule-event-form";
import { PlanClock } from "~/features/plan/components/plan-clock";
import { PlanTemplatesCard } from "~/features/plan/components/plan-templates-card";
import { useBoardScheduleActions } from "~/features/plan/hooks/use-board-schedule-actions";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import { usePlanWindow } from "~/features/plan/hooks/use-plan-window";
import {
  DEFAULT_DAY_BLOCK_END,
  DEFAULT_DAY_BLOCK_START,
} from "~/features/plan/lib/board-schedule-layout";
import type { PlanScheduleEventInput } from "~/features/plan/schemas/board-schedule-event-schema";
import { goalsListQuery } from "~/hooks/goals-queries";
import { useItemsList } from "~/hooks/use-items-list";
import { useObstaclePlans } from "~/hooks/use-obstacle-plans";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import { toPlanGoalRead } from "~/lib/plan-goal-read";
import { parseDateJst } from "~/lib/schemas/calendar-date-schema";
import { useOptionalGoalsLiveQuery } from "~/lib/tanstack-db/collections";

const PLAN_CLOCK_HEADING_ID = "plan-clock-heading";

export function PlanListTab() {
  const view = usePlanView();
  const { events, unplannedConfirmedMinutes } = usePlanWindow(view.selectedDateJst, "day");
  const { data: items } = useItemsList();
  const liveGoals = useOptionalGoalsLiveQuery();
  const obstaclePlans = useObstaclePlans();
  const [{ data: queriedGoals }, { data: templates }] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(goalsListQuery()),
      parallelConvexQuery(convexQuery(api.queries.planTemplates.list.list, {})),
    ],
  });
  const goals = liveGoals.isReady && liveGoals.data !== undefined ? liveGoals.data : queriedGoals;
  const actions = useBoardScheduleActions();
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<PlanScheduleEventInput | null>(null);
  const [calendar, setCalendar] = useState({
    forSelected: view.selectedDateJst,
    month: view.selectedDateJst,
  });
  const month =
    calendar.forSelected === view.selectedDateJst ? calendar.month : view.selectedDateJst;
  const editingId = formValues?.eventId;
  const editing =
    editingId === undefined ? undefined : events.find((event) => event._id === editingId);

  return (
    <Stack gap="xl">
      <aside
        aria-labelledby={PLAN_CLOCK_HEADING_ID}
        className="flex w-full flex-col items-center"
      >
        <Title id={PLAN_CLOCK_HEADING_ID} order={2}>
          一日の時計
        </Title>
        <PlanClock
          events={events}
          selectedDateJst={view.selectedDateJst}
          todayJst={view.today}
          unplannedConfirmedMinutes={unplannedConfirmedMinutes}
        />
      </aside>
      <Stack gap="md">
        <DatePicker
          allowDeselect={false}
          aria-label="日付を選択"
          date={month}
          onChange={(value) => {
            const next = parseDateJst(value);
            if (next !== undefined) {
              view.setDate(next);
            }
          }}
          onDateChange={(value) => {
            const next = parseDateJst(value);
            if (next !== undefined) {
              setCalendar({ forSelected: view.selectedDateJst, month: next });
            }
          }}
          value={view.selectedDateJst}
        />
        <Button
          onClick={() => {
            view.setDate(view.today);
            setCalendar({ forSelected: view.today, month: view.today });
          }}
          variant="light"
        >
          今日
        </Button>
        <Button
          onClick={() => {
            setFormValues(
              slotFormValues(
                `${view.selectedDateJst} ${DEFAULT_DAY_BLOCK_START}`,
                `${view.selectedDateJst} ${DEFAULT_DAY_BLOCK_END}`,
              ),
            );
            setFormOpened(true);
          }}
        >
          予定を追加
        </Button>
        {events.length === 0 ? (
          <Text c="dimmed" size="sm">
            この日の予定はまだありません。
          </Text>
        ) : (
          <Stack gap="xs">
            {events.map((event) => (
              <UnstyledButton
                key={event._id}
                onClick={() => {
                  setFormValues(eventFormValues(event));
                  setFormOpened(true);
                }}
              >
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={600}>{event.title}</Text>
                      <Text c="dimmed" size="sm">
                        {event.startTime}–{event.endTime}
                      </Text>
                    </Stack>
                    <Text size="sm">{PLAN_PRIORITY_STYLE[event.priority].label}</Text>
                  </Group>
                </Card>
              </UnstyledButton>
            ))}
          </Stack>
        )}
        <BoardScheduleEventForm
          frozen={editing?.recordState.kind === "materialized"}
          initialValues={formValues}
          items={items}
          onClose={() => setFormOpened(false)}
          onDelete={
            editingId === undefined
              ? undefined
              : async () => {
                  const result = await actions.onRemoveBlock({ eventId: editingId });
                  if (Result.isOk(result)) setFormOpened(false);
                  return result;
                }
          }
          onSubmit={async (values) => {
            const eventId = values.eventId ?? formValues?.eventId;
            if (eventId === undefined) {
              return await actions.onCreateBlock(values);
            }
            return await actions.onUpdateBlock({ ...values, eventId });
          }}
          opened={formOpened}
        />
        <PlanTemplatesCard
          dateJst={view.selectedDateJst}
          hasEvents={events.length > 0}
          items={items}
          templates={templates}
        />
        <PlanGoalsReadCard goals={goals.map(toPlanGoalRead)} />
        <Card>
          <ObstacleSection
            obstacles={obstaclePlans.obstacles}
            onCreateObstacle={obstaclePlans.onCreateObstacle}
            onRemoveObstacle={obstaclePlans.onRemoveObstacle}
            onUpdateObstacle={obstaclePlans.onUpdateObstacle}
          />
        </Card>
      </Stack>
    </Stack>
  );
}
