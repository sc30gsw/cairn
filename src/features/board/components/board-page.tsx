import { Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";

import { PageTitle } from "~/components/page-title";
import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardKanbanTab } from "~/features/board/components/board-kanban-tab";
import { BoardSchedulePending } from "~/features/board/components/board-schedule-pending";
import { BoardScheduleTab } from "~/features/board/components/board-schedule-tab";
import { BoardTabs, BoardTabsPending } from "~/features/board/components/board-tabs";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import {
  boardShimmerObstacle,
  boardShimmerRows,
} from "~/features/board/lib/board-shimmer-template";

export function BoardPage() {
  return (
    <Suspense fallback={<BoardPending />}>
      <BoardReady />
    </Suspense>
  );
}

function BoardPending() {
  const { tab } = useBoardView();

  return (
    <>
      <PageTitle data-shimmer-ignore mb="md">
        ボード
      </PageTitle>
      <Shimmer loading>
        <Text c="dimmed" mb="md" size="sm">
          今日の記録の状態と、チェックポイント。書く場所は日のままです。
        </Text>
        <BoardTabsPending
          kanban={
            <BoardKanban
              checkpointLabel="Part 2 を聞き取る（2026-08-20）"
              dateJst="2026-08-17"
              interactive={false}
              obstacles={[boardShimmerObstacle]}
              rows={boardShimmerRows}
            />
          }
          schedule={tab === "schedule" ? <BoardSchedulePending /> : null}
        />
      </Shimmer>
    </>
  );
}

function BoardReady() {
  const { tab } = useBoardView();

  return (
    <>
      <PageTitle mb="md">ボード</PageTitle>
      <Text c="dimmed" mb="md" size="sm">
        今日の記録の状態と、チェックポイント。書く場所は日のままです。
      </Text>
      <BoardTabs
        kanban={<BoardKanbanTab />}
        schedule={tab === "schedule" ? <BoardScheduleTab /> : null}
      />
    </>
  );
}
