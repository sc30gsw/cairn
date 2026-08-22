import { Tabs } from "@mantine/core";
import type { ReactNode } from "react";

import { useBoardView } from "~/features/board/hooks/use-board-view";
import type { BoardTab } from "~/features/board/schemas/board-search-schema";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

type BoardTabsProps = {
  kanban: ReactNode;
  schedule: ReactNode;
};

export function BoardTabs({ kanban, schedule }: BoardTabsProps) {
  const { setTab, tab } = useBoardView();

  return (
    <Tabs
      onChange={(value) => {
        if (value === "kanban" || value === "schedule") {
          setTab(value);
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
};

export function BoardTabsPending({ kanban, schedule }: BoardTabsPendingProps) {
  const { setTab, tab } = useBoardView();

  return (
    <Tabs
      onChange={(value) => {
        if (value === "kanban" || value === "schedule") {
          setTab(value);
        }
      }}
      value={tab}
    >
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
