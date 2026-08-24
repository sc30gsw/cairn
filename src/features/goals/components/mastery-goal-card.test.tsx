import { expect, test, vi } from "vite-plus/test";

import {
  ACHIEVED_BADGE_LABEL,
  LONG_TERM_CARD_TITLE,
  MasteryGoalBody,
} from "~/features/goals/components/mastery-goal-card";
import { ALL_RECORDS_LABEL } from "~/features/goals/lib/goal-scope";
import {
  KINFURE_ITEM,
  scopeItemsFixture,
  SHADOWING_ITEM,
} from "~/features/goals/mocks/goal-scope-fixture";
import type { MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const LONG_TERM = {
  _id: "goal-long-term" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 2,
  confirmedMinutes: 90,
  content: "Distinction の例文を口頭で言い切る",
  createdAt: 1_755_000_000_000,
  criterion: "3秒以内に例文を口に出せる",
  deadline: undefined,
  parentGoalId: undefined,
  type: "mastery",
} satisfies MasteryGoal;

const ACHIEVED_LONG_TERM = {
  ...LONG_TERM,
  _id: "goal-achieved" as MasteryGoal["_id"],
  achievedAt: "2026-08-09",
} satisfies MasteryGoal;

function bodyProps(goal: MasteryGoal) {
  return {
    goal,
    items: scopeItemsFixture,
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onSetAchieved: vi.fn(),
    todayJst: TODAY,
  };
}

test("長期目標として見出し・基準・学習量の実績を出す", () => {
  const { getByText } = renderWithMantine(<MasteryGoalBody {...bodyProps(LONG_TERM)} />);
  expect(getByText(LONG_TERM_CARD_TITLE)).toBeDefined();
  expect(getByText("基準: 3秒以内に例文を口に出せる")).toBeDefined();
  expect(getByText("確定 90分 / 2日")).toBeDefined();
});

test("達成済みの長期目標はバッジと達成日を出す", () => {
  const { getByText } = renderWithMantine(<MasteryGoalBody {...bodyProps(ACHIEVED_LONG_TERM)} />);
  expect(getByText(ACHIEVED_BADGE_LABEL)).toBeDefined();
  expect(getByText("達成 2026-08-09")).toBeDefined();
});

test("達成を取り消すとバッジと達成日が消える(再描画)", () => {
  const view = renderWithMantine(<MasteryGoalBody {...bodyProps(ACHIEVED_LONG_TERM)} />);
  expect(view.getByText(ACHIEVED_BADGE_LABEL)).toBeDefined();

  view.rerender(<MasteryGoalBody {...bodyProps(LONG_TERM)} />);

  expect(view.queryByText(ACHIEVED_BADGE_LABEL)).toBeNull();
  expect(view.queryByText("達成 2026-08-09")).toBeNull();
});

test("達成チェックで onSetAchieved が今日の日付つきで呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalBody {...bodyProps(LONG_TERM)} onSetAchieved={onSetAchieved} />,
  );
  getByRole("checkbox", { name: `${LONG_TERM.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({ achievedAt: TODAY, goalId: LONG_TERM._id });
});

test("達成済みのチェックを外すと達成日を落として呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalBody {...bodyProps(ACHIEVED_LONG_TERM)} onSetAchieved={onSetAchieved} />,
  );
  getByRole("checkbox", { name: `${ACHIEVED_LONG_TERM.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED_LONG_TERM._id,
  });
});

test("編集と削除のアクションが呼ばれる", () => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalBody {...bodyProps(LONG_TERM)} onEdit={onEdit} onRemove={onRemove} />,
  );
  getByRole("button", { name: `${LONG_TERM.content}を編集` }).click();
  getByRole("button", { name: `${LONG_TERM.content}を削除` }).click();
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledOnce();
});

test("対象項目が未指定なら「すべての記録」と書く", () => {
  const { getByText } = renderWithMantine(<MasteryGoalBody {...bodyProps(LONG_TERM)} />);
  expect(getByText(`対象: ${ALL_RECORDS_LABEL}`)).toBeDefined();
});

test("親カードは対象項目の全項目名を出す(短縮しない)", () => {
  const { getByText } = renderWithMantine(
    <MasteryGoalBody
      {...bodyProps({ ...LONG_TERM, scopeItemIds: [KINFURE_ITEM._id, SHADOWING_ITEM._id] })}
    />,
  );
  expect(getByText("対象: 金フレ / 音読パッケージ")).toBeDefined();
  expect(getByText("確定 90分 / 2日")).toBeDefined();
});

test("親カードにも進捗バー・パーセンテージは出さない", () => {
  const { queryByRole, queryByText } = renderWithMantine(
    <MasteryGoalBody {...bodyProps({ ...LONG_TERM, scopeItemIds: [KINFURE_ITEM._id] })} />,
  );
  expect(queryByRole("progressbar")).toBeNull();
  expect(queryByText(/%/)).toBeNull();
});
