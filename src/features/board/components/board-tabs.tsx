import { Tabs } from "@mantine/core";
import type { ReactNode } from "react";

import type { BoardTab } from "~/features/board/schemas/board-search-schema";

import tabBarClasses from "~/features/board/components/board-tab-bar.module.css";

type BoardTabsProps = {
  kanban: ReactNode;
  onTabChange: (tab: BoardTab) => void;
  schedule: ReactNode;
  tab: BoardTab;
};

export function BoardTabs({ kanban, onTabChange, schedule, tab }: BoardTabsProps) {
  return (
    <Tabs
      onChange={(value) => {
        if (value === "kanban" || value === "schedule") {
          onTabChange(value);
        }
      }}
      value={tab}
      variant="pills"
    >
      <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
        <Tabs.Tab value={"kanban" satisfies BoardTab}>カンバン</Tabs.Tab>
        <Tabs.Tab value={"schedule" satisfies BoardTab}>スケジュール</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel pt="md" value="kanban">
        {tab === "kanban" ? kanban : null}
      </Tabs.Panel>
      <Tabs.Panel pt="md" value="schedule">
        {tab === "schedule" ? schedule : null}
      </Tabs.Panel>
    </Tabs>
  );
}

type BoardTabsPendingProps = {
  kanban: ReactNode;
  schedule?: ReactNode;
  tab: BoardTab;
};

export function BoardTabsPending({ kanban, schedule, tab }: BoardTabsPendingProps) {
  return (
    <Tabs value={tab}>
      <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
        <Tabs.Tab value="kanban">カンバン</Tabs.Tab>
        <Tabs.Tab value="schedule">スケジュール</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel pt="md" value="kanban">
        {tab === "kanban" ? kanban : null}
      </Tabs.Panel>
      <Tabs.Panel pt="md" value="schedule">
        {tab === "schedule" ? schedule : null}
      </Tabs.Panel>
    </Tabs>
  );
}
