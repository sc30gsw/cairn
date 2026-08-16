import { Card, Group, Stack, Tabs, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

export function HistoryPending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Title order={1}>履歴</Title>
        <Tabs value="month">
          <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
            <Tabs.Tab value="month">月</Tabs.Tab>
            <Tabs.Tab value="week">週</Tabs.Tab>
            <Tabs.Tab value="analysis">分析</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel pt="md" value="month">
            <Card h={420} padding={0} />
          </Tabs.Panel>
        </Tabs>
        <Group grow>
          <Card h={36} padding={0} />
          <Card h={36} padding={0} />
          <Card h={36} padding={0} />
        </Group>
      </Stack>
    </Shimmer>
  );
}
