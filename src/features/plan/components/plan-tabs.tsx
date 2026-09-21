import { Tabs } from "@mantine/core";
import type { ReactNode } from "react";

import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import type { PlanTab } from "~/features/plan/schemas/plan-search-schema";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

type PlanTabsProps = {
  list: ReactNode;
  schedule: ReactNode;
};

export function PlanTabs({ list, schedule }: PlanTabsProps) {
  const { setTab, tab } = usePlanView();

  return (
    <Tabs
      onChange={(value) => {
        if (value === "plan" || value === "schedule") {
          setTab(value);
        }
      }}
      value={tab}
      variant="pills"
    >
      <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
        <Tabs.Tab value={"plan" satisfies PlanTab}>プラン</Tabs.Tab>
        <Tabs.Tab value={"schedule" satisfies PlanTab}>スケジュール</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel pt="md" value="plan">
        {tab === "plan" ? list : null}
      </Tabs.Panel>
      <Tabs.Panel pt="md" value="schedule">
        {tab === "schedule" ? schedule : null}
      </Tabs.Panel>
    </Tabs>
  );
}
