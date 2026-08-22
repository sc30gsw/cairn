import { Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";
import type { DateJst } from "~domain/jst";

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

function boardLeadCopy(selectedDateJst: DateJst, today: DateJst) {
  if (selectedDateJst === today) {
    return "今日の記録の状態と、チェックポイント。書く場所は日のままです。";
  }
  return `${selectedDateJst} の記録の状態と、チェックポイント。書く場所は日のままです。`;
}

export function BoardPage() {
  return (
    <Suspense fallback={<BoardPending />}>
      <BoardReady />
    </Suspense>
  );
}

function BoardPending() {
  const { selectedDateJst, tab, today } = useBoardView();

  return (
    <>
      <PageTitle data-shimmer-ignore mb="md">
        ボード
      </PageTitle>
      <Shimmer loading>
        <Text c="dimmed" mb="md" size="sm">
          {boardLeadCopy(selectedDateJst, today)}
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
  const { selectedDateJst, tab, today } = useBoardView();

  return (
    <>
      <PageTitle mb="md">ボード</PageTitle>
      <Text c="dimmed" mb="md" size="sm">
        {boardLeadCopy(selectedDateJst, today)}
      </Text>
      <BoardTabs
        kanban={<BoardKanbanTab />}
        schedule={tab === "schedule" ? <BoardScheduleTab /> : null}
      />
    </>
  );
}
