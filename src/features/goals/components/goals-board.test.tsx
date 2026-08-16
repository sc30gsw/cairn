import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { renderWithMantine } from "~/test-utils/render";

const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

function makeTrendWeek(weekIndex: number, goalMinutes: number | null, achieved: boolean) {
  return {
    achieved,
    goalMinutes,
    volumeMinutes: achieved ? 320 : 0,
    weekEnd: `2026-07-${String(10 + weekIndex).padStart(2, "0")}`,
    weekStart: `2026-07-${String(4 + weekIndex).padStart(2, "0")}`,
  };
}

function goalsBoardProps(trendWeeks: ReturnType<typeof makeTrendWeek>[]) {
  return {
    exam: { daysRemaining: 43, examDate: "2026-09-27", maxScore: 850, minScore: 730 },
    obstacles: [],
    onCreateObstacle: vi.fn(),
    onRemoveObstacle: vi.fn(),
    onSaveExam: vi.fn(),
    onSaveWeekly: vi.fn(),
    onUpdateObstacle: vi.fn(),
    todayJst: "2026-08-17" as const,
    trendWeeks,
    volumeMinutes: 30,
    weekEndJst: "2026-08-23",
    weeklyGoalMinutes: 300,
  };
}

test("2週連続達成でストリークバッジが出る", () => {
  const trendWeeks = [makeTrendWeek(1, 300, true), makeTrendWeek(0, 300, true)];
  const { getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps(trendWeeks)} />);
  expect(getByText("2週連続達成中")).toBeDefined();
});

test("1週だけの達成ではストリークバッジを出さない", () => {
  const trendWeeks = [makeTrendWeek(0, 300, true)];
  const { queryByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps(trendWeeks)} />);
  expect(queryByText(/週連続達成中/)).toBeNull();
});

test("遡れる12週すべて達成なら「12週+」表記になる(#24)", () => {
  const trendWeeks = Array.from({ length: 12 }, (_, index) => makeTrendWeek(11 - index, 300, true));
  const { getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps(trendWeeks)} />);
  expect(getByText("12週+連続達成中")).toBeDefined();
});

test("カウントダウンと週間ゴールと障害プランが見える", () => {
  const { getByText, getByRole, getAllByLabelText } = renderWithMantine(
    <GoalsBoard
      exam={{ daysRemaining: 43, examDate: "2026-09-27", maxScore: 850, minScore: 730 }}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: THEN_ACTION }]}
      onCreateObstacle={vi.fn()}
      onRemoveObstacle={vi.fn()}
      onSaveExam={vi.fn()}
      onSaveWeekly={vi.fn()}
      onUpdateObstacle={vi.fn()}
      todayJst="2026-08-17"
      trendWeeks={[]}
      volumeMinutes={30}
      weekEndJst="2026-08-23"
      weeklyGoalMinutes={300}
    />,
  );
  expect(getByText(/2026-09-27 まであと 43 日/)).toBeDefined();
  expect(getByText(/730/)).toBeDefined();
  expect(getByText(/週間ゴール 10%/)).toBeDefined();
  expect(getByText(/もし 眠い なら Unit 3 の例文を声に出して5文読む/)).toBeDefined();
  expect(getByRole("button", { name: "障害プランを追加" })).toBeDefined();
  expect(getByRole("button", { name: "眠いを保存" })).toBeDefined();
  expect(getAllByLabelText("具体的手順の書き方")).toHaveLength(2);
});

test("障害プランを追加したら入力が空に戻る", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      exam={{ daysRemaining: 43, examDate: "2026-09-27", maxScore: 850, minScore: 730 }}
      obstacles={[]}
      onCreateObstacle={onCreateObstacle}
      onRemoveObstacle={vi.fn()}
      onSaveExam={vi.fn()}
      onSaveWeekly={vi.fn()}
      onUpdateObstacle={vi.fn()}
      todayJst="2026-08-17"
      trendWeeks={[]}
      volumeMinutes={30}
      weekEndJst="2026-08-23"
      weeklyGoalMinutes={300}
    />,
  );
  const ifInput = getByRole("textbox", { name: "もし" }) as HTMLInputElement;
  const thenInput = getByRole("textbox", { name: "なら" }) as HTMLInputElement;
  fireEvent.change(ifInput, { target: { value: "眠い" } });
  fireEvent.change(thenInput, { target: { value: THEN_ACTION } });
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).toHaveBeenCalledWith({
      ifText: "眠い",
      thenText: THEN_ACTION,
    });
  });
  expect(ifInput.value).toBe("");
  expect(thenInput.value).toBe("");
});
