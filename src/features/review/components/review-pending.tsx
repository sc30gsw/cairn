import { Tabs, Title } from "@mantine/core";

import { WeeklyReviewTabPending } from "~/features/review/components/weekly-review-tab-pending";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

export function ReviewPending() {
  return (
    <>
      <Title data-shimmer-ignore mb="md" order={1}>
        レビュー
      </Title>
      <Tabs value="weekly" variant="pills">
        <Tabs.List className={tabBarClasses.tabBar} data-shimmer-ignore grow justify="center">
          <Tabs.Tab value="weekly">週次</Tabs.Tab>
          <Tabs.Tab value="monthly">月次</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel pt="md" value="weekly">
          <WeeklyReviewTabPending />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
