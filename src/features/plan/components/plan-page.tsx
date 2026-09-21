import { Group, Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";
import type { DateJst } from "~domain/jst";

import { PageTitle } from "~/components/page-title";
import { BoardSchedulePending } from "~/features/plan/components/board-schedule-pending";
import { BoardScheduleTab } from "~/features/plan/components/board-schedule-tab";
import { PlanCalendarSyncButton } from "~/features/plan/components/plan-calendar-sync-button";
import { PlanListTab } from "~/features/plan/components/plan-list-tab";
import { PlanTabs } from "~/features/plan/components/plan-tabs";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";

function planLeadCopy(selectedDateJst: DateJst, today: DateJst) {
  if (selectedDateJst === today) {
    return "今日の計画。記録は日のままです。";
  }
  return `${selectedDateJst} の計画。記録は日のままです。`;
}

export function PlanPage() {
  return (
    <>
      <Group justify="space-between" mb="md">
        <PageTitle>計画</PageTitle>
        <PlanCalendarSyncButton />
      </Group>
      <Suspense fallback={<PlanPending />}>
        <PlanReady />
      </Suspense>
    </>
  );
}

function PlanPending() {
  const { selectedDateJst, tab, today } = usePlanView();

  return (
    <Shimmer loading>
      <Text c="dimmed" mb="md" size="sm">
        {planLeadCopy(selectedDateJst, today)}
      </Text>
      <PlanTabs list={null} schedule={tab === "schedule" ? <BoardSchedulePending /> : null} />
    </Shimmer>
  );
}

function PlanReady() {
  const { selectedDateJst, today } = usePlanView();

  return (
    <>
      <Text c="dimmed" mb="md" size="sm">
        {planLeadCopy(selectedDateJst, today)}
      </Text>
      <PlanTabs list={<PlanListTab />} schedule={<BoardScheduleTab />} />
    </>
  );
}
