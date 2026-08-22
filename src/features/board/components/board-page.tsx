import { Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";
import { todayJst, type DateJst } from "~domain/jst";

import { PageTitle } from "~/components/page-title";
import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardSchedule } from "~/features/board/components/board-schedule";
import { BoardTabs, BoardTabsPending } from "~/features/board/components/board-tabs";
import {
  useBoardApplyRowOrder,
  useBoardConfirmRow,
  useBoardScheduleCreate,
  useBoardScheduleMove,
  useBoardScheduleRemove,
  useBoardScheduleUpdate,
  useBoardSkipRow,
  useBoardUnconfirmRow,
  useBoardUnskipRow,
} from "~/features/board/hooks/board-mutations";
import { useBoardScheduleBlocks } from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import {
  boardShimmerObstacle,
  boardShimmerRows,
} from "~/features/board/lib/board-shimmer-template";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import type { BoardRow } from "~/features/board/types/board";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";
import { runMutation } from "~/lib/run-mutation";

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
          今日の記録の状態と、チェックポイント。書く場所は日のままです。
        </Text>
        <BoardTabsPending
          kanban={
            <BoardKanban
              checkpointLabel="Part 2 を聞き取る（2026-08-20）"
              dateJst="2026-08-17"
              obstacles={[boardShimmerObstacle]}
              onApplyOrder={async () => undefined}
              onConfirm={async () => undefined}
              onSkip={async () => undefined}
              onUnconfirm={async () => undefined}
              onUnskip={async () => undefined}
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
  const applyOrder = useBoardApplyRowOrder(today, today);
  const confirmRow = useBoardConfirmRow(today, today);
  const skipRow = useBoardSkipRow(today, today);
  const unskipRow = useBoardUnskipRow(today, today);
  const unconfirmRow = useBoardUnconfirmRow(today, today);
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
        今日の記録の状態と、チェックポイント。書く場所は日のままです。
      </Text>
      <BoardTabs
        kanban={
          <BoardKanban
            checkpointLabel={checkpointLabel}
            dateJst={today}
            obstacles={obstacles}
            onApplyOrder={(input) =>
              runMutation(() => applyOrder.mutateAsync(input), {
                successMessage: "並べ替えを保存しました",
              }).then(() => undefined)
            }
            onConfirm={(input) =>
              runMutation(() => confirmRow.mutateAsync(input), {
                successMessage: "記録を確定しました",
              }).then(() => undefined)
            }
            onSkip={(input) =>
              runMutation(() => skipRow.mutateAsync(input), {
                successMessage: "スキップしました",
              }).then(() => undefined)
            }
            onUnskip={(input) =>
              runMutation(() => unskipRow.mutateAsync(input), {
                successMessage: "未着手に戻しました",
              }).then(() => undefined)
            }
            onUnconfirm={(input) =>
              runMutation(() => unconfirmRow.mutateAsync(input), {
                successMessage: "未着手に戻しました",
              }).then(() => undefined)
            }
            rows={day.rows}
          />
        }
        onTabChange={setTab}
        schedule={
          tab === "schedule" ? (
            <BoardScheduleTab checkpoint={checkpoint} rows={day.rows} today={today} />
          ) : null
        }
        tab={tab}
      />
    </>
  );
}

function BoardScheduleTab({
  checkpoint,
  rows,
  today,
}: {
  checkpoint: ReturnType<typeof nearestCheckpoint>;
  rows: readonly BoardRow[];
  today: DateJst;
}) {
  const {
    monthDate,
    scheduleAnchor,
    scheduleView,
    selectedDateJst,
    setDate,
    setMonth,
    setScheduleView,
    setWeek,
    weekAnchor,
  } = useBoardView();
  const { data: blocks } = useBoardScheduleBlocks(scheduleAnchor);
  const createBlock = useBoardScheduleCreate(today, today);
  const updateBlock = useBoardScheduleUpdate(today, today);
  const removeBlock = useBoardScheduleRemove(today);
  const moveBlock = useBoardScheduleMove(today);

  return (
    <BoardSchedule
      anchorDateJst={scheduleAnchor}
      blocks={blocks}
      checkpoint={checkpoint}
      dateJst={today}
      monthDate={monthDate}
      onCreateBlock={(input) =>
        runMutation(() => createBlock.mutateAsync(input), {
          successMessage: "予定を追加しました",
        }).then(() => undefined)
      }
      onDateChange={setDate}
      onMonthChange={setMonth}
      onMoveBlock={(input) =>
        runMutation(() => moveBlock.mutateAsync(input), {
          successMessage: "予定を移動しました",
        }).then(() => undefined)
      }
      onRemoveBlock={(input) =>
        runMutation(() => removeBlock.mutateAsync(input), {
          successMessage: "予定を削除しました",
        }).then(() => undefined)
      }
      onScheduleViewChange={setScheduleView}
      onUpdateBlock={(input) =>
        runMutation(() => updateBlock.mutateAsync(input), {
          successMessage: "予定を更新しました",
        }).then(() => undefined)
      }
      onWeekChange={setWeek}
      rows={rows}
      scheduleView={scheduleView}
      selectedDateJst={selectedDateJst}
      todayJst={today}
      weekAnchor={weekAnchor}
    />
  );
}
