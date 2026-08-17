import { fireEvent, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import {
  CHECKPOINT_EMPTY_MESSAGE,
  CHECKPOINT_SECTION_TITLE,
} from "~/features/goals/components/checkpoint-section";
import { EXAM_GOAL_INCOMPLETE_TITLE } from "~/features/goals/components/exam-goal-card";
import { CHECKPOINT_CROWDED_MESSAGE } from "~/features/goals/components/goal-form-fields";
import {
  EXAM_GOAL_EMPTY_TITLE,
  GoalsBoard,
  OPEN_MASTERY_SECTION_TITLE,
} from "~/features/goals/components/goals-board";
import { OVERDUE_LABEL } from "~/features/goals/components/mastery-goal-card";
import type { Goal } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import { renderWithMantine } from "~/test-utils/render";
import type { CategoryDto } from "~/types/category";

const TODAY = "2026-08-17";
const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

const EXAM_GOAL = {
  _id: "goal-exam" as Goal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies Goal;

//? 期限つき・未達成の習得がチェックポイント。SOON のほうが期限が早い
const SOON_CHECKPOINT = {
  _id: "goal-soon" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  criterion: "Unit 1-10 を止まらずに音読できる",
  deadline: "2026-08-23",
  type: "mastery",
} satisfies Goal;

const LATER_CHECKPOINT = {
  _id: "goal-later" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 1,
  confirmedMinutes: 45,
  content: "Part 5 を10問解く",
  criterion: "10問を8分で解ける",
  deadline: "2026-08-30",
  type: "mastery",
} satisfies Goal;

const OVERDUE_CHECKPOINT = {
  _id: "goal-overdue" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 0,
  confirmedMinutes: 0,
  content: "公式問題集を1回分解く",
  criterion: "時間内に1回分を解き切れる",
  deadline: "2026-08-10",
  type: "mastery",
} satisfies Goal;

const OPEN_MASTERY = {
  _id: "goal-open" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 2,
  confirmedMinutes: 90,
  content: "Distinction の例文を口頭で言い切る",
  criterion: "3秒以内に例文を口に出せる",
  deadline: undefined,
  type: "mastery",
} satisfies Goal;

const ACHIEVED_MASTERY = {
  _id: "goal-achieved" as Goal["_id"],
  achievedAt: "2026-08-09",
  activeDays: 6,
  confirmedMinutes: 300,
  content: "金のフレーズ Unit 1 を暗唱する",
  criterion: "見ずに Unit 1 を言える",
  deadline: "2026-08-09",
  type: "mastery",
} satisfies Goal;

const MINUTES_TARGET = {
  _id: "target-input" as TargetProgress["_id"],
  achieved: false,
  categoryId: "category-input" as CategoryDto["_id"],
  categoryName: "インプット",
  current: 60,
  metric: "minutes",
  targetValue: 120,
} satisfies TargetProgress;

function goalsBoardProps(goals: Goal[], targets: TargetProgress[] = []) {
  return {
    goals,
    obstacles: [],
    onCreateGoal: vi.fn(),
    onCreateObstacle: vi.fn(),
    onRemoveGoal: vi.fn(),
    onRemoveObstacle: vi.fn(),
    onSetAchieved: vi.fn(),
    onUpdateGoal: vi.fn(),
    onUpdateObstacle: vi.fn(),
    todayJst: TODAY,
    weeklyTargets: {
      categories: [],
      onRemoveTarget: vi.fn(),
      onSaveTarget: vi.fn(),
      targets,
    },
  };
}

test("本番目標のカウントダウンとスコア帯が見える", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL], [MINUTES_TARGET])} />,
  );
  expect(getByText(/2026-09-27 まであと 41 日/)).toBeDefined();
  expect(getByText(/730/)).toBeDefined();
});

test("週間ターゲットが1件も無い本番目標は未完成として設定を促す", () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />,
  );
  expect(getByText(EXAM_GOAL_INCOMPLETE_TITLE)).toBeDefined();
  expect(getByRole("button", { name: "週間ターゲットを設定する" })).toBeDefined();
});

test("週間ターゲットがあれば未完成の促しは出ない", () => {
  const { queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL], [MINUTES_TARGET])} />,
  );
  expect(queryByText(EXAM_GOAL_INCOMPLETE_TITLE)).toBeNull();
});

test("チェックポイントは期限の早い順に並ぶ", () => {
  const { getAllByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, LATER_CHECKPOINT, SOON_CHECKPOINT])} />,
  );
  const labels = getAllByRole("checkbox").map((checkbox) => checkbox.getAttribute("aria-label"));
  expect(labels).toEqual([`${SOON_CHECKPOINT.content}の達成`, `${LATER_CHECKPOINT.content}の達成`]);
});

test("期限を過ぎたチェックポイントは表示だけが変わる", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, OVERDUE_CHECKPOINT])} />,
  );
  expect(getByText(OVERDUE_LABEL)).toBeDefined();
  expect(getByText(/期限 2026-08-10/)).toBeDefined();
});

test("達成チェックを入れると onSetAchieved が今日の日付つきで呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} onSetAchieved={onSetAchieved} />,
  );
  getByRole("checkbox", { name: `${SOON_CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: TODAY,
    goalId: SOON_CHECKPOINT._id,
  });
});

test("達成済みのチェックを外すと達成日を落として呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL, ACHIEVED_MASTERY])}
      onSetAchieved={onSetAchieved}
    />,
  );
  getByRole("checkbox", { name: `${ACHIEVED_MASTERY.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED_MASTERY._id,
  });
});

test("達成済みは件数つきの一覧になり、達成日が残る", () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, ACHIEVED_MASTERY])} />,
  );
  expect(getByRole("button", { name: /達成済み（1件）/ })).toBeDefined();
  expect(getByText("達成 2026-08-09")).toBeDefined();
});

test("チェックポイントがゼロ件なら置くよう促す", () => {
  const { getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  expect(getByText(CHECKPOINT_EMPTY_MESSAGE)).toBeDefined();
});

test("期限なしの習得は別の一覧に出て、学習量の実績を併記する", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, OPEN_MASTERY])} />,
  );
  expect(getByText(OPEN_MASTERY_SECTION_TITLE)).toBeDefined();
  expect(getByText("基準: 3秒以内に例文を口に出せる")).toBeDefined();
  expect(getByText("確定 90分 / 2日")).toBeDefined();
});

test("本番目標が無ければ空状態から作成できる", async () => {
  const { getByRole, getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps([])} />);
  expect(getByText(EXAM_GOAL_EMPTY_TITLE)).toBeDefined();

  getByRole("button", { name: "本番目標を作成する" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "目標スコア下限" })).toBeDefined();
  });
});

test("本番目標が無ければ上部の「目標を追加」が本番目標の導線として出る", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([])} />);
  getByRole("button", { name: "目標を追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "目標スコア下限" })).toBeDefined();
  });
});

test("フォームを開いている間は本番目標の空状態カードを出さず、閉じると戻る", async () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([])} />,
  );
  getByRole("button", { name: "目標を追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "目標スコア下限" })).toBeDefined();
  });
  expect(queryByText(EXAM_GOAL_EMPTY_TITLE)).toBeNull();

  getByRole("button", { name: "キャンセル" }).click();
  await waitFor(() => {
    expect(getByText(EXAM_GOAL_EMPTY_TITLE)).toBeDefined();
  });
});

test("本番目標が無ければチェックポイントの追加エリアは出ない", () => {
  const { queryByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([])} />);
  expect(queryByRole("region", { name: CHECKPOINT_SECTION_TITLE })).toBeNull();
  expect(queryByRole("button", { name: "チェックポイントを追加" })).toBeNull();
});

test("本番目標があれば上部の「目標を追加」は出ず、追加はチェックポイントだけになる", () => {
  const { getByRole, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />,
  );
  expect(queryByRole("button", { name: "目標を追加" })).toBeNull();
  expect(getByRole("button", { name: "チェックポイントを追加" })).toBeDefined();
});

test("「チェックポイントを追加」のフォームはチェックポイント区画の中に開く", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  getByRole("button", { name: "チェックポイントを追加" }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  });
  const section = within(getByRole("region", { name: CHECKPOINT_SECTION_TITLE }));
  expect(section.getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  //? タイプは習得に固定。選択欄は出さない
  expect(section.queryByRole("combobox", { name: /目標タイプ/ })).toBeNull();
});

test("「チェックポイントを追加」から作ると期限が次の日曜で埋まる", async () => {
  const onCreateGoal = vi.fn();
  const { getByRole, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} onCreateGoal={onCreateGoal} />,
  );
  getByRole("button", { name: "チェックポイントを追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  });
  expect(queryByRole("combobox", { name: /目標タイプ/ })).toBeNull();

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: SOON_CHECKPOINT.content },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: SOON_CHECKPOINT.criterion },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onCreateGoal).toHaveBeenCalledWith({
      content: SOON_CHECKPOINT.content,
      criterion: SOON_CHECKPOINT.criterion,
      deadline: "2026-08-23",
      type: "mastery",
    });
  });
  expect(queryByRole("textbox", { name: "達成の基準" })).toBeNull();
});

test("追いかけ中のチェックポイントが2件あると3件目の作成で助言が出る", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT, LATER_CHECKPOINT])} />,
  );
  getByRole("button", { name: "チェックポイントを追加" }).click();
  await waitFor(() => {
    expect(getByText(CHECKPOINT_CROWDED_MESSAGE)).toBeDefined();
  });
});

test("追いかけ中が1件なら助言は出ない", async () => {
  const { getByRole, queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("button", { name: "チェックポイントを追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  });
  expect(queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
});

test("編集アイコンを押すと既存の値でフォームが開き、タイプは変えられない", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${SOON_CHECKPOINT.content}を編集` }).click();
  await waitFor(() => {
    expect((getByRole("textbox", { name: "達成の基準" }) as HTMLInputElement).value).toBe(
      SOON_CHECKPOINT.criterion,
    );
  });
  expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
});

test("削除アイコンを押すと onRemoveGoal が目標IDで呼ばれる", () => {
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} onRemoveGoal={onRemoveGoal} />,
  );
  getByRole("button", { name: `${SOON_CHECKPOINT.content}を削除` }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(SOON_CHECKPOINT._id);
});

test("チェックポイントの追加フォームはキャンセルで閉じる", async () => {
  const { getByRole, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />,
  );
  getByRole("button", { name: "チェックポイントを追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  });

  getByRole("button", { name: "キャンセル" }).click();
  await waitFor(() => {
    expect(queryByRole("textbox", { name: "達成の基準" })).toBeNull();
  });
});

test("障害プランの追加・更新・削除ができる", async () => {
  const onCreateObstacle = vi.fn();
  const onUpdateObstacle = vi.fn();
  const onRemoveObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL])}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: THEN_ACTION }]}
      onCreateObstacle={onCreateObstacle}
      onRemoveObstacle={onRemoveObstacle}
      onUpdateObstacle={onUpdateObstacle}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "もし" }), { target: { value: "とても眠い" } });
  fireEvent.change(getByRole("textbox", { name: "なら" }), { target: { value: THEN_ACTION } });
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).toHaveBeenCalledWith({
      ifText: "とても眠い",
      thenText: THEN_ACTION,
    });
  });

  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).toHaveBeenCalledWith({
      ifText: "眠い",
      planId: "o1",
      thenText: THEN_ACTION,
    });
  });

  getByRole("button", { name: "削除" }).click();
  expect(onRemoveObstacle).toHaveBeenCalledWith("o1");
});
