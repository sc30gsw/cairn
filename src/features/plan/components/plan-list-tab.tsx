import { convexQuery } from "@convex-dev/react-query";
import { Card, Stack, Title } from "@mantine/core";
import { queryOptions, useSuspenseQueries } from "@tanstack/react-query";
import { Result } from "better-result";
import { useState } from "react";
import type { DateJst } from "~domain/jst";
import { planWeekAheadMaxDateJst } from "~domain/jst";

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
import { PlanEventsList } from "~/features/plan/components/plan-events-list";
import { PlanTemplatesCard } from "~/features/plan/components/plan-templates-card";
import { useBoardScheduleActions } from "~/features/plan/hooks/use-board-schedule-actions";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import { usePlanWindow } from "~/features/plan/hooks/use-plan-window";
import { planEventDateWithTime } from "~/features/plan/lib/plan-event-time";
import type { PlanScheduleEventInput } from "~/features/plan/schemas/board-schedule-event-schema";
import { goalsListQuery } from "~/hooks/goals-queries";
import { useItemsList } from "~/hooks/use-items-list";
import { useObstaclePlans } from "~/hooks/use-obstacle-plans";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import { toPlanGoalRead } from "~/lib/plan-goal-read";
import {
  useOptionalExternalCalendarEventsLiveQuery,
  useOptionalGoalsLiveQuery,
  useOptionalPlanTemplatesLiveQuery,
  useOptionalPlanWindowLiveQuery,
} from "~/lib/tanstack-db/collections";

export const PLAN_DATE_PREV_TOOLTIP = "前の日の計画へ";
export const PLAN_DATE_NEXT_TOOLTIP = "次の日の計画へ";
export const PLAN_DATE_TODAY_TOOLTIP = "今日の計画へ";

export function PlanListTab() {
  const view = usePlanView();
  const queriedWindow = usePlanWindow(view.selectedDateJst, "day");
  const liveWindow = useOptionalPlanWindowLiveQuery({
    anchorDateJst: view.selectedDateJst,
    view: "day",
  });
  const { data: items } = useItemsList();
  const liveGoals = useOptionalGoalsLiveQuery();
  const liveTemplates = useOptionalPlanTemplatesLiveQuery();
  const obstaclePlans = useObstaclePlans();
  const externalsQuery = convexQuery(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: view.selectedDateJst,
    view: "day",
  });
  const liveExternals = useOptionalExternalCalendarEventsLiveQuery({
    anchorDateJst: view.selectedDateJst,
    view: "day",
  });
  const [{ data: queriedGoals }, { data: queriedTemplates }, { data: queriedExternals }] =
    useSuspenseQueries({
      queries: [
        parallelConvexQuery(goalsListQuery()),
        parallelConvexQuery(convexQuery(api.queries.planTemplates.list.list, {})),
        parallelConvexQuery(queryOptions(externalsQuery)),
      ],
    });
  const liveWindowReady = liveWindow.isReady && liveWindow.data !== undefined;
  const events = liveWindowReady ? liveWindow.data.page : queriedWindow.events;
  const appliedTemplateId = liveWindowReady
    ? liveWindow.data.appliedTemplateId
    : queriedWindow.appliedTemplateId;
  const unplannedConfirmedMinutes = liveWindowReady
    ? liveWindow.data.unplannedConfirmedMinutes
    : queriedWindow.unplannedConfirmedMinutes;
  const externals =
    liveExternals.isReady && liveExternals.data !== undefined
      ? liveExternals.data
      : queriedExternals;
  const goals = liveGoals.isReady && liveGoals.data !== undefined ? liveGoals.data : queriedGoals;
  const templates =
    liveTemplates.isReady && liveTemplates.data !== undefined
      ? liveTemplates.data
      : queriedTemplates;
  const actions = useBoardScheduleActions();
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<PlanScheduleEventInput | null>(null);
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
        tooltipLabels={{
          next: PLAN_DATE_NEXT_TOOLTIP,
          prev: PLAN_DATE_PREV_TOOLTIP,
          today: PLAN_DATE_TODAY_TOOLTIP,
        }}
      />
      <PlanEventsList
        dateJst={view.selectedDateJst}
        eventsFallback={events}
        headerEnd={
          <PlanEventAddButton
            onClick={() => {
              setFormValues(createPlanEventFormValues(view.selectedDateJst));
              setFormOpened(true);
            }}
          />
        }
        items={items}
        onSelectEvent={(event) => {
          setFormValues(eventFormValues(event));
          setFormOpened(true);
        }}
      />
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
        appliedTemplateId={appliedTemplateId}
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
