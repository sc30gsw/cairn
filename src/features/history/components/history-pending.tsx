import { Tabs, Title } from "@mantine/core";

import { HistoryMonthTabPending } from "~/features/history/components/history-month-tab-pending";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

export function HistoryPending() {
  return (
    <>
      <Title data-shimmer-ignore mb="md" order={1}>
        履歴
      </Title>
      <Tabs value="month" variant="pills">
        <Tabs.List className={tabBarClasses.tabBar} data-shimmer-ignore grow justify="center">
          <Tabs.Tab value="month">月</Tabs.Tab>
          <Tabs.Tab value="week">週</Tabs.Tab>
          <Tabs.Tab value="analysis">分析</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel pt="md" value="month">
          <HistoryMonthTabPending />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
