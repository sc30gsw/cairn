import { Tabs } from "@mantine/core";
import { Suspense } from "react";

import { PageTitle } from "~/components/page-title";
import { HistoryAnalysisTab } from "~/features/history/components/history-analysis-tab";
import { HistoryAnalysisTabPending } from "~/features/history/components/history-analysis-tab-pending";
import { HistoryMonthTab } from "~/features/history/components/history-month-tab";
import { HistoryMonthTabPending } from "~/features/history/components/history-month-tab-pending";
import { HistoryPending } from "~/features/history/components/history-pending";
import { HistoryWeekTab } from "~/features/history/components/history-week-tab";
import { HistoryWeekTabPending } from "~/features/history/components/history-week-tab-pending";
import { useHistoryView } from "~/features/history/hooks/use-history-view";
import type { HistoryTab } from "~/features/history/schemas/history-search-schema";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

export function HistoryPage() {
  return (
    <Suspense fallback={<HistoryPending />}>
      <HistoryReady />
    </Suspense>
  );
}

function HistoryReady() {
  const { setTab, tab } = useHistoryView();

  return (
    <>
      <PageTitle mb="md">履歴</PageTitle>
      <Tabs
        onChange={(value) => {
          if (value === "month" || value === "week" || value === "analysis") {
            setTab(value);
          }
        }}
        value={tab}
      >
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value={"month" satisfies HistoryTab}>月</Tabs.Tab>
          <Tabs.Tab value={"week" satisfies HistoryTab}>週</Tabs.Tab>
          <Tabs.Tab value={"analysis" satisfies HistoryTab}>分析</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="md" value="month">
          {tab === "month" ? (
            <Suspense fallback={<HistoryMonthTabPending />}>
              <HistoryMonthTab />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="week">
          {tab === "week" ? (
            <Suspense fallback={<HistoryWeekTabPending />}>
              <HistoryWeekTab />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="analysis">
          {tab === "analysis" ? (
            <Suspense fallback={<HistoryAnalysisTabPending />}>
              <HistoryAnalysisTab />
            </Suspense>
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
