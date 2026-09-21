import { Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";
import type { DateJst } from "~domain/jst";

import { PageTitle } from "~/components/page-title";
import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardKanbanTab } from "~/features/board/components/board-kanban-tab";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { boardShimmerRows } from "~/features/board/lib/board-shimmer-template";

function boardLeadCopy(selectedDateJst: DateJst, today: DateJst) {
  if (selectedDateJst === today) {
    return "今日の記録の状態。書く場所は日のままです。";
  }
  return `${selectedDateJst} の記録の状態。書く場所は日のままです。`;
}

export function BoardPage() {
  return (
    <>
      <PageTitle>ボード</PageTitle>
      <Suspense fallback={<BoardPending />}>
        <BoardReady />
      </Suspense>
    </>
  );
}

function BoardPending() {
  const { selectedDateJst, today } = useBoardView();

  return (
    <Shimmer loading>
      <Text c="dimmed" mb="md" size="sm">
        {boardLeadCopy(selectedDateJst, today)}
      </Text>
      <BoardKanban dateJst="2026-08-17" interactive={false} rows={boardShimmerRows} />
    </Shimmer>
  );
}

function BoardReady() {
  const { selectedDateJst, today } = useBoardView();

  return (
    <>
      <Text c="dimmed" mb="md" size="sm">
        {boardLeadCopy(selectedDateJst, today)}
      </Text>
      <BoardKanbanTab />
    </>
  );
}
