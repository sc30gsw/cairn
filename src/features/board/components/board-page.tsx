import { Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";
import { todayJst } from "~domain/jst";

import { PageTitle } from "~/components/page-title";
import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardSchedule } from "~/features/board/components/board-schedule";
import { BoardTabs, BoardTabsPending } from "~/features/board/components/board-tabs";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import {
  boardShimmerObstacle,
  boardShimmerRows,
} from "~/features/board/lib/board-shimmer-template";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

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
      <Shimmer loading>
        <Text c="dimmed" mb="md" size="sm">
          今日の記録の状態と、次の一手。書く場所は日のままです。
        </Text>
        <BoardTabsPending
          kanban={
            <BoardKanban
              checkpointLabel="Part 2 を聞き取る（2026-08-20）"
              obstacles={[boardShimmerObstacle]}
              rows={boardShimmerRows}
            />
          }
        />
      </Shimmer>
    </>
  );
}

function BoardReady() {
  const today = todayJst();
  const { setTab, tab } = useBoardView();
  const { data: day } = useOpenAndLoadDay(today, today);
  const { data: goals } = useGoalsList();
  const { data: obstacles } = useObstaclesList();
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
      <BoardTabs
        kanban={
          <BoardKanban checkpointLabel={checkpointLabel} obstacles={obstacles} rows={day.rows} />
        }
        onTabChange={setTab}
        schedule={<BoardSchedule checkpoint={checkpoint} dateJst={today} rows={day.rows} />}
        tab={tab}
      />
    </>
  );
}
