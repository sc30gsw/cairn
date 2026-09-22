import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { useDayBoardActions } from "~/features/today/hooks/use-day-board-actions";
import type { DayRow } from "~/features/today/types/day";

const confirmMutate = vi.fn(async () => null);
const moveMutate = vi.fn(async () => null);
const noopMutate = vi.fn(async () => null);

vi.mock("@mantine/notifications", () => ({
  notifications: { hide: vi.fn(), show: vi.fn() },
}));

vi.mock("~/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("~/hooks/use-today-jst", () => ({
  useTodayJst: () => "2026-08-17",
}));

vi.mock("~/features/today/hooks/day-mutations", () => ({
  useAddRow: () => ({ mutateAsync: noopMutate }),
  useCopyYesterdayConfirmed: () => ({ mutateAsync: noopMutate }),
  useOptimisticConfirmRow: () => ({ mutateAsync: confirmMutate }),
  useOptimisticFlagReview: () => ({ mutateAsync: noopMutate }),
  useOptimisticMoveAndApplyRowOrder: () => ({ mutateAsync: moveMutate }),
  useOptimisticSetDayCondition: () => ({ mutateAsync: noopMutate }),
  useOptimisticSetDayMemo: () => ({ mutateAsync: noopMutate }),
  useOptimisticSkipRow: () => ({ mutateAsync: noopMutate }),
  useOptimisticUnflagReview: () => ({ mutateAsync: noopMutate }),
  useOptimisticUnskipRow: () => ({ mutateAsync: noopMutate }),
  useRemoveDay: () => ({ mutateAsync: noopMutate }),
  useRemoveRow: () => ({ mutateAsync: noopMutate }),
  useSwitchPreset: () => ({ mutateAsync: noopMutate }),
}));

test("グループの確定は計測中でも分数を渡し、計測経路へは行かない", async () => {
  confirmMutate.mockClear();
  moveMutate.mockClear();
  const rowId = "row1" as DayRow["_id"];
  const { result } = renderHook(() =>
    useDayBoardActions("2026-08-17", [
      {
        _id: rowId,
        category: "多聴",
        timer: { accumulatedMs: 12 * 60_000, autoStoppedAt: null, startedAt: null },
      },
    ]),
  );
  await result.current.onConfirmMany([{ content: "Unit 1", minutes: 21, rowId }]);
  expect(confirmMutate).toHaveBeenCalledWith({ content: "Unit 1", minutes: 21, rowId });
  expect(moveMutate).not.toHaveBeenCalled();
});
