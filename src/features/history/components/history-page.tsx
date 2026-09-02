import { Anchor, Box, Group, Tabs } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { isSearchableQuery } from "~domain/searchText";

import { PageTitle } from "~/components/page-title";
import { HistoryAnalysisTab } from "~/features/history/components/history-analysis-tab";
import { HistoryAnalysisTabPending } from "~/features/history/components/history-analysis-tab-pending";
import { HistoryMonthTab } from "~/features/history/components/history-month-tab";
import { HistoryMonthTabPending } from "~/features/history/components/history-month-tab-pending";
import { HistoryPending } from "~/features/history/components/history-pending";
import { HistorySearchInput } from "~/features/history/components/history-search-input";
import { HistorySearchResults } from "~/features/history/components/history-search-results";
import { HistoryWeekTab } from "~/features/history/components/history-week-tab";
import { HistoryWeekTabPending } from "~/features/history/components/history-week-tab-pending";
import { useHistoryView } from "~/features/history/hooks/use-history-view";
import type { HistoryTab } from "~/features/history/schemas/history-search-schema";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

export function HistoryPage() {
  return (
    <Suspense fallback={<HistoryPending />}>
      <HistoryReady />
    </Suspense>
  );
}

function HistoryReady() {
  const { searchQuery, setTab, tab } = useHistoryView();
  //? 検索語が2文字以上のあいだはタブの代わりに結果を出す（タブは増やさない）
  const searching = isSearchableQuery(searchQuery);

  return (
    <>
      <Group align="center" justify="space-between" mb="md">
        <PageTitle>履歴</PageTitle>
        <Anchor component={Link} to="/review">
          レビューを見る
        </Anchor>
      </Group>
      <Box mb="md">
        <HistorySearchInput />
      </Box>
      {searching ? (
        <HistorySearchResults />
      ) : (
        <Tabs
          onChange={(value) => {
            if (value === "month" || value === "week" || value === "analysis") {
              setTab(value);
            }
          }}
          value={tab}
          variant="pills"
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
      )}
    </>
  );
}
