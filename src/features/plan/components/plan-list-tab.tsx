import { convexQuery } from "@convex-dev/react-query";
import {
  Button,
  Card,
  Collapse,
  ColorSwatch,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { queryOptions, useSuspenseQueries } from "@tanstack/react-query";
import { Result } from "better-result";
import { useState } from "react";
import type { DateJst } from "~domain/jst";
import { planWeekAheadMaxDateJst } from "~domain/jst";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import { api } from "~/../convex/_generated/api";
import { LearningDateNavigation } from "~/components/learning-date-navigation";
import { ObstacleSection } from "~/components/obstacle-section";
import { PlanGoalsReadCard } from "~/components/plan-goals-read-card";
import {
  BoardScheduleEventForm,
  eventFormValues,
} from "~/features/plan/components/board-schedule-event-form";
import { PLAN_CLOCK_HEADING, PlanClock } from "~/features/plan/components/plan-clock";
import { PlanEventAddButton } from "~/features/plan/components/plan-day-schedule-list";
import { PlanTemplatesCard } from "~/features/plan/components/plan-templates-card";
import { useBoardScheduleActions } from "~/features/plan/hooks/use-board-schedule-actions";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import { usePlanWindow } from "~/features/plan/hooks/use-plan-window";
import { planEventDisplayName } from "~/features/plan/lib/plan-event-display-name";
import { planEventDateWithTime } from "~/features/plan/lib/plan-event-time";
import type { PlanScheduleEventInput } from "~/features/plan/schemas/board-schedule-event-schema";
import { goalsListQuery } from "~/hooks/goals-queries";
import { useItemsList } from "~/hooks/use-items-list";
import { useObstaclePlans } from "~/hooks/use-obstacle-plans";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import { toPlanGoalRead } from "~/lib/plan-goal-read";
import { useOptionalExternalCalendarEventsLiveQuery } from "~/lib/tanstack-db/collections";
import { useOptionalGoalsLiveQuery } from "~/lib/tanstack-db/collections";

export const PLAN_APPLIED_EVENTS_LABEL = "予定一覧";

export function PlanListTab() {
  const view = usePlanView();
  const { events, unplannedConfirmedMinutes } = usePlanWindow(view.selectedDateJst, "day");
  const { data: items } = useItemsList();
  const liveGoals = useOptionalGoalsLiveQuery();
  const obstaclePlans = useObstaclePlans();
  const externalsQuery = convexQuery(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: view.selectedDateJst,
    view: "day",
  });
  const liveExternals = useOptionalExternalCalendarEventsLiveQuery({
    anchorDateJst: view.selectedDateJst,
    view: "day",
  });
  const [{ data: queriedGoals }, { data: templates }, { data: queriedExternals }] =
    useSuspenseQueries({
      queries: [
        parallelConvexQuery(goalsListQuery()),
        parallelConvexQuery(convexQuery(api.queries.planTemplates.list.list, {})),
        parallelConvexQuery(queryOptions(externalsQuery)),
      ],
    });
  const externals =
    liveExternals.isReady && liveExternals.data !== undefined
      ? liveExternals.data
      : queriedExternals;
  const goals = liveGoals.isReady && liveGoals.data !== undefined ? liveGoals.data : queriedGoals;
  const actions = useBoardScheduleActions();
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<PlanScheduleEventInput | null>(null);
  const [appliedOpened, setAppliedOpened] = useState(false);
  const editingId = formValues?.eventId;
  const editing =
    editingId === undefined ? undefined : events.find((event) => event._id === editingId);
  const maxDateJst = planWeekAheadMaxDateJst(view.today);

  return (
    <Stack gap="md">
      <LearningDateNavigation
        dateJst={view.selectedDateJst}
        maxDateJst={maxDateJst}
        onDateChange={view.setDate}
        onGoToToday={() => view.setDate(view.today)}
        todayJst={view.today}
      />
      <Group justify="flex-end">
        {events.length === 0 ? null : (
          <Button
            aria-expanded={appliedOpened}
            aria-label={PLAN_APPLIED_EVENTS_LABEL}
            onClick={() => setAppliedOpened((current) => !current)}
            variant={appliedOpened ? "filled" : "light"}
            type="button"
          >
            {PLAN_APPLIED_EVENTS_LABEL}
          </Button>
        )}
        <PlanEventAddButton
          onClick={() => {
            setFormValues(createPlanEventFormValues(view.selectedDateJst));
            setFormOpened(true);
          }}
        />
      </Group>
      {events.length === 0 ? (
        <Text c="dimmed" size="sm">
          この日の予定はまだありません。
        </Text>
      ) : (
        <Collapse expanded={appliedOpened} keepMounted={false} transitionDuration={0}>
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
                      <Text fw={600}>{planEventDisplayName(event.title, event.itemId, items)}</Text>
                      <Text c="dimmed" size="sm">
                        {event.startTime}–{event.endTime}
                      </Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <ColorSwatch color={PLAN_PRIORITY_STYLE[event.priority].hex} size={14} />
                      <Text size="sm">{PLAN_PRIORITY_STYLE[event.priority].label}</Text>
                    </Group>
                  </Group>
                </Card>
              </UnstyledButton>
            ))}
          </Stack>
        </Collapse>
      )}
      <BoardScheduleEventForm
        dateJst={view.selectedDateJst}
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
        events={events}
        externals={externals}
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
      <Card aria-label={PLAN_CLOCK_HEADING} padding="md" withBorder>
        <Stack gap="md">
          <Title order={2}>{PLAN_CLOCK_HEADING}</Title>
          <PlanClock
            events={events}
            selectedDateJst={view.selectedDateJst}
            todayJst={view.today}
            unplannedConfirmedMinutes={unplannedConfirmedMinutes}
          />
        </Stack>
      </Card>
    </Stack>
  );
}

function createPlanEventFormValues(dateJst: DateJst): PlanScheduleEventInput {
  return {
    end: planEventDateWithTime(dateJst, "10:00"),
    eventId: undefined,
    itemId: undefined,
    priority: "medium",
    start: planEventDateWithTime(dateJst, "09:00"),
    title: "",
  };
}
