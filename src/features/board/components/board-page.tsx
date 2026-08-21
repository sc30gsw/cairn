import { Tabs, Text } from "@mantine/core";
import { Suspense } from "react";
import { todayJst } from "~domain/jst";

import { PageTitle } from "~/components/page-title";
import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardSchedule } from "~/features/board/components/board-schedule";
import {
  useBoardDay,
  useBoardGoals,
  useBoardObstacles,
} from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import type { BoardTab } from "~/features/board/schemas/board-search-schema";

import tabBarClasses from "~/features/board/components/board-tab-bar.module.css";

export function BoardPage() {
  return (
    <Suspense fallback={<BoardPending />}>
      <BoardReady />
    </Suspense>
  );
}

function BoardPending() {
  return (
    <>
      <PageTitle data-shimmer-ignore mb="md">
        ボード
      </PageTitle>
      <Text c="dimmed">読み込み中</Text>
    </>
  );
}

function BoardReady() {
  const today = todayJst();
  const { setTab, tab } = useBoardView();
  const { data: day } = useBoardDay(today, today);
  const { data: goals } = useBoardGoals();
  const { data: obstacles } = useBoardObstacles();
  const checkpoint = nearestCheckpoint(goals, today);
  const checkpointLabel =
    checkpoint === null
      ? null
      : checkpoint.deadline === undefined
        ? checkpoint.content
        : `${checkpoint.content}（${checkpoint.deadline}）`;

  return (
    <>
      <PageTitle mb="md">ボード</PageTitle>
      <Text c="dimmed" mb="md" size="sm">
        今日の記録の状態と、次の一手。書く場所は日のままです。
      </Text>
      <Tabs
        onChange={(value) => {
          if (value === "kanban" || value === "schedule") {
            setTab(value);
          }
        }}
        value={tab}
      >
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value={"kanban" satisfies BoardTab}>カンバン</Tabs.Tab>
          <Tabs.Tab value={"schedule" satisfies BoardTab}>スケジュール</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel pt="md" value="kanban">
          {tab === "kanban" ? (
            <BoardKanban checkpointLabel={checkpointLabel} obstacles={obstacles} rows={day.rows} />
          ) : null}
        </Tabs.Panel>
        <Tabs.Panel pt="md" value="schedule">
          {tab === "schedule" ? (
            <BoardSchedule checkpoint={checkpoint} dateJst={today} rows={day.rows} />
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
