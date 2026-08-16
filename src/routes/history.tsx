import { Tabs, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { HistoryAnalysisTab } from "~/features/history/components/history-analysis-tab";
import { HistoryAnalysisTabPending } from "~/features/history/components/history-analysis-tab-pending";
import { HistoryMonthTab } from "~/features/history/components/history-month-tab";
import { HistoryMonthTabPending } from "~/features/history/components/history-month-tab-pending";
import { HistoryPending } from "~/features/history/components/history-pending";
import { HistoryWeekTab } from "~/features/history/components/history-week-tab";
import { HistoryWeekTabPending } from "~/features/history/components/history-week-tab-pending";
import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});

function HistoryRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<HistoryPending />}>
        <HistoryReady />
      </Suspense>
    </OwnerGate>
  );
}

function HistoryReady() {
  const today = todayJst();
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00+09:00`));
  const [selectedDateJst, setSelectedDateJst] = useState(today);
  const [activeTab, setActiveTab] = useState<string | null>("month");
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("day");
  const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const weekAnchor = mondayOfWeek(selectedDateJst);

  const openDayAnalysis = (dateJst: string) => {
    setSelectedDateJst(dateJst);
    setMonth(new Date(`${dateJst}T12:00:00+09:00`));
    setAnalysisScope("day");
    setActiveTab("analysis");
  };

  return (
    <>
      <Title mb="md" order={1}>
        履歴
      </Title>
      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value="month">月</Tabs.Tab>
          <Tabs.Tab value="week">週</Tabs.Tab>
          <Tabs.Tab value="analysis">分析</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="md" value="month">
          {activeTab === "month" ? (
            <Suspense fallback={<HistoryMonthTabPending />}>
              <HistoryMonthTab
                month={month}
                onDayClick={openDayAnalysis}
                onMonthChange={setMonth}
                today={today}
                yearMonth={yearMonth}
              />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="week">
          {activeTab === "week" ? (
            <Suspense fallback={<HistoryWeekTabPending />}>
              <HistoryWeekTab today={today} weekAnchor={weekAnchor} />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="analysis">
          {activeTab === "analysis" ? (
            <Suspense fallback={<HistoryAnalysisTabPending />}>
              <HistoryAnalysisTab
                analysisScope={analysisScope}
                onDayClick={openDayAnalysis}
                onScopeChange={setAnalysisScope}
                selectedDateJst={selectedDateJst}
                today={today}
                weekAnchor={weekAnchor}
                yearMonth={yearMonth}
              />
            </Suspense>
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
