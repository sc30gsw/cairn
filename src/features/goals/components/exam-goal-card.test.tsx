import { expect, test, vi } from "vite-plus/test";

import {
  EXAM_GOAL_INCOMPLETE_TITLE,
  ExamGoalCard,
} from "~/features/goals/components/exam-goal-card";
import type { ExamGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const EXAM_GOAL = {
  _id: "goal-exam" as ExamGoal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies ExamGoal;

const PAST_EXAM_GOAL = {
  ...EXAM_GOAL,
  examDate: "2026-08-01",
} satisfies ExamGoal;

function cardProps(overrides: Partial<Parameters<typeof ExamGoalCard>[0]> = {}) {
  return {
    goal: EXAM_GOAL,
    hasWeeklyTargets: false,
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onShowWeeklyTargets: vi.fn(),
    todayJst: TODAY,
    ...overrides,
  };
}

test("本番日当日は残り0日として表示する", () => {
  const { getByText } = renderWithMantine(
    <ExamGoalCard {...cardProps({ goal: { ...EXAM_GOAL, examDate: TODAY }, todayJst: TODAY })} />,
  );
  expect(getByText(/2026-08-17 まであと 0 日/)).toBeDefined();
});

test("本番までの残り日数とスコア帯が見える", () => {
  const { getByText } = renderWithMantine(<ExamGoalCard {...cardProps()} />);
  expect(getByText(/2026-09-27 まであと 41 日/)).toBeDefined();
  expect(getByText(/730〜850/)).toBeDefined();
});

test("本番日を過ぎているときは過ぎた旨だけを強調する", () => {
  const { getByText, queryByText } = renderWithMantine(
    <ExamGoalCard {...cardProps({ goal: PAST_EXAM_GOAL })} />,
  );
  expect(getByText("本番日を過ぎています。")).toBeDefined();
  expect(queryByText(/まであと/)).toBeNull();
});

test("週間ターゲットが無いときは設定を促す", () => {
  const onShowWeeklyTargets = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <ExamGoalCard {...cardProps({ onShowWeeklyTargets })} />,
  );
  expect(getByText(EXAM_GOAL_INCOMPLETE_TITLE)).toBeDefined();
  getByRole("button", { name: "週間ターゲットを設定する" }).click();
  expect(onShowWeeklyTargets).toHaveBeenCalledOnce();
});

test("週間ターゲットがあれば未完成の促しは出ない", () => {
  const { queryByText } = renderWithMantine(
    <ExamGoalCard {...cardProps({ hasWeeklyTargets: true })} />,
  );
  expect(queryByText(EXAM_GOAL_INCOMPLETE_TITLE)).toBeNull();
});

test("編集と削除のアクションが呼ばれる", () => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const { getByRole } = renderWithMantine(<ExamGoalCard {...cardProps({ onEdit, onRemove })} />);
  getByRole("button", { name: `${EXAM_GOAL.content}を編集` }).click();
  getByRole("button", { name: `${EXAM_GOAL.content}を削除` }).click();
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledOnce();
});

test("残り日数の大きな数字が表示される", () => {
  const { getByText } = renderWithMantine(<ExamGoalCard {...cardProps()} />);
  expect(getByText("41")).toBeDefined();
});
