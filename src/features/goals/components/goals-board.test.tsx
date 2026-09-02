import { fireEvent, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { ACHIEVED_SECTION_TITLE } from "~/features/goals/components/achieved-history-section";
import {
  ACHIEVEMENT_REFLECTION_LABEL,
  ACHIEVEMENT_REFLECTION_SUBMIT,
} from "~/features/goals/components/achievement-reflection-modal";
import { OVERDUE_LABEL } from "~/features/goals/components/checkpoint-row";
import {
  CREATE_EXAM_LABEL,
  EXAM_GOAL_EMPTY_TITLE,
  NEXT_EXAM_TITLE,
} from "~/features/goals/components/exam-empty-card";
import {
  EXAM_GOAL_FINISHED_BADGE,
  EXAM_GOAL_INCOMPLETE_TITLE,
  examResultActionName,
} from "~/features/goals/components/exam-goal-card";
import {
  EXAM_RESULT_SCORE_LABEL,
  EXAM_RESULT_SUBMIT,
} from "~/features/goals/components/exam-result-modal";
import { CHECKPOINT_CROWDED_MESSAGE } from "~/features/goals/components/goal-form-fields";
import { GOAL_HIERARCHY_HINT, GoalsBoard } from "~/features/goals/components/goals-board";
import {
  LONG_TERM_ADD_LABEL,
  LONG_TERM_EMPTY_MESSAGE,
  LONG_TERM_HINT,
  LONG_TERM_SECTION_TITLE,
} from "~/features/goals/components/long-term-section";
import { ACHIEVED_BADGE_LABEL } from "~/features/goals/components/mastery-goal-card";
import {
  ORPHAN_CHECKPOINTS_MESSAGE,
  ORPHAN_CHECKPOINTS_TITLE,
} from "~/features/goals/components/orphan-checkpoints-alert";
import {
  CHECKPOINT_GROUP_EMPTY_MESSAGE,
  CHECKPOINT_GROUP_TITLE,
} from "~/features/goals/components/parent-goal-group";
import {
  EXAM_RESULT_CORRECTED_MESSAGE,
  EXAM_RESULT_RECORDED_MESSAGE,
} from "~/features/goals/lib/exam-result-copy";
import {
  KINFURE_ITEM,
  scopeCategoriesFixture,
  scopeItemsFixture,
} from "~/features/goals/mocks/goal-scope-fixture";
import type { Goal } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import { renderWithMantine } from "~/test-utils/render";
import type { CategoryDto } from "~/types/category";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

const TODAY = "2026-08-17";
const NEXT_SUNDAY = "2026-08-23";
const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

const {
  onCreateGoal,
  onCreateObstacle,
  onRemoveGoal,
  onRemoveObstacle,
  onSetAchieved,
  onSetExamResult,
  onUpdateGoal,
  onUpdateObstacle,
} = vi.hoisted(() => ({
  onCreateGoal: vi.fn(),
  onCreateObstacle: vi.fn(),
  onRemoveGoal: vi.fn(),
  onRemoveObstacle: vi.fn(),
  onSetAchieved: vi.fn(),
  onSetExamResult: vi.fn(),
  onUpdateGoal: vi.fn(),
  onUpdateObstacle: vi.fn(),
}));

vi.mock("~/features/goals/hooks/use-goals-board-actions", () => ({
  useGoalsBoardActions: () => ({
    onCreateGoal,
    onCreateObstacle,
    onRemoveGoal,
    onRemoveObstacle,
    onSetAchieved,
    onSetExamResult,
    onUpdateGoal,
    onUpdateObstacle,
  }),
  useWeeklyTargetActions: () => ({
    onRemoveTarget: vi.fn(),
    onSaveTarget: vi.fn(),
  }),
}));

beforeEach(() => {
  onCreateGoal.mockClear();
  onCreateObstacle.mockClear();
  onRemoveGoal.mockClear();
  onRemoveObstacle.mockClear();
  onSetAchieved.mockClear();
  onSetExamResult.mockClear();
  onUpdateGoal.mockClear();
  onUpdateObstacle.mockClear();
});

const EXAM_GOAL = {
  _id: "goal-exam" as Goal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  createdAt: 1_755_000_000_000,
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies Goal;

const PAST_EXAM_GOAL = {
  ...EXAM_GOAL,
  examDate: "2026-08-10",
} satisfies Goal;

const FINISHED_EXAM_GOAL = {
  ...PAST_EXAM_GOAL,
  result: { recordedAt: "2026-08-16", score: 875 },
} satisfies Goal;

const SOON_CHECKPOINT = {
  _id: "goal-soon" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  createdAt: 1_755_000_100_000,
  criterion: "Unit 1-10 を止まらずに音読できる",
  deadline: "2026-08-23",
  parentGoalId: EXAM_GOAL._id,
  type: "mastery",
} satisfies Goal;

const LATER_CHECKPOINT = {
  ...SOON_CHECKPOINT,
  _id: "goal-later" as Goal["_id"],
  activeDays: 1,
  confirmedMinutes: 45,
  content: "Part 5 を10問解く",
  createdAt: 1_755_000_200_000,
  criterion: "10問を8分で解ける",
  deadline: "2026-08-30",
} satisfies Goal;

const OVERDUE_CHECKPOINT = {
  ...SOON_CHECKPOINT,
  _id: "goal-overdue" as Goal["_id"],
  activeDays: 0,
  confirmedMinutes: 0,
  content: "公式問題集を1回分解く",
  createdAt: 1_755_000_300_000,
  criterion: "時間内に1回分を解き切れる",
  deadline: "2026-08-10",
} satisfies Goal;

const LONG_TERM_GOAL = {
  _id: "goal-long-term" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 2,
  confirmedMinutes: 90,
  content: "Distinction の例文を口頭で言い切る",
  createdAt: 1_755_000_400_000,
  criterion: "3秒以内に例文を口に出せる",
  deadline: undefined,
  parentGoalId: undefined,
  type: "mastery",
} satisfies Goal;

const LONG_TERM_CHECKPOINT = {
  ...SOON_CHECKPOINT,
  _id: "goal-long-term-child" as Goal["_id"],
  content: "Chapter 1-3 を暗唱する",
  createdAt: 1_755_000_500_000,
  criterion: "例文を見ずに言える",
  deadline: "2026-09-06",
  parentGoalId: LONG_TERM_GOAL._id,
} satisfies Goal;

const ACHIEVED_CHECKPOINT = {
  ...SOON_CHECKPOINT,
  _id: "goal-achieved" as Goal["_id"],
  achievedAt: "2026-08-09",
  activeDays: 6,
  confirmedMinutes: 300,
  content: "金のフレーズ Unit 1 を暗唱する",
  createdAt: 1_755_000_600_000,
  criterion: "見ずに Unit 1 を言える",
  deadline: "2026-08-09",
} satisfies Goal;

const ORPHAN_CHECKPOINT = {
  ...SOON_CHECKPOINT,
  _id: "goal-orphan" as Goal["_id"],
  content: "親のない刻み",
  createdAt: 1_755_000_700_000,
  parentGoalId: undefined,
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
    categories: scopeCategoriesFixture,
    goals,
    items: scopeItemsFixture,
    obstacles: [],
    targets,
    todayJst: TODAY,
  };
}

function addCheckpointName(parentContent: string) {
  return `${parentContent}にチェックポイントを追加`;
}

test("ページ見出しの下に階層の説明を出す", () => {
  const { getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  expect(getByText(GOAL_HIERARCHY_HINT)).toBeDefined();
  expect(getByText(LONG_TERM_HINT)).toBeDefined();
});

test("子が0件の親グループは見出しと「なし」だけを出す", () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  const group = within(getByRole("region", { name: `${EXAM_GOAL.content}のチェックポイント` }));
  expect(group.getByText(CHECKPOINT_GROUP_TITLE)).toBeDefined();
  expect(group.getByText(CHECKPOINT_GROUP_EMPTY_MESSAGE)).toBeDefined();
});

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

test("本番目標の下に子が期限の早い順に並ぶ", () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, LATER_CHECKPOINT, SOON_CHECKPOINT])} />,
  );
  const group = within(getByRole("region", { name: `${EXAM_GOAL.content}のチェックポイント` }));
  const labels = group
    .getAllByRole("checkbox")
    .map((checkbox) => checkbox.getAttribute("aria-label"));
  expect(labels).toEqual([`${SOON_CHECKPOINT.content}の達成`, `${LATER_CHECKPOINT.content}の達成`]);
});

test("長期目標の下にはその親の子だけが並ぶ", () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT, LONG_TERM_GOAL, LONG_TERM_CHECKPOINT])}
    />,
  );
  const longTermGroup = within(
    getByRole("region", { name: `${LONG_TERM_GOAL.content}のチェックポイント` }),
  );
  expect(
    longTermGroup.getAllByRole("checkbox").map((checkbox) => checkbox.getAttribute("aria-label")),
  ).toEqual([`${LONG_TERM_CHECKPOINT.content}の達成`]);
  expect(longTermGroup.queryByText(SOON_CHECKPOINT.content)).toBeNull();
});

test("期限を過ぎたチェックポイントは表示だけが変わる", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, OVERDUE_CHECKPOINT])} />,
  );
  expect(getByText(OVERDUE_LABEL)).toBeDefined();
  expect(getByText(/期限 2026-08-10/)).toBeDefined();
});

test("達成チェックを入れると振り返りを聞き、送ると onSetAchieved が今日の日付と振り返りつきで呼ばれる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("checkbox", { name: `${SOON_CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).not.toHaveBeenCalled();

  const textbox = await waitFor(() =>
    getByRole("textbox", { hidden: true, name: new RegExp(ACHIEVEMENT_REFLECTION_LABEL) }),
  );
  fireEvent.input(textbox, { target: { value: " 音読が効いた " } });
  fireEvent.click(getByRole("button", { hidden: true, name: ACHIEVEMENT_REFLECTION_SUBMIT }));

  await waitFor(() => {
    expect(onSetAchieved).toHaveBeenCalledWith({
      achievedAt: TODAY,
      goalId: SOON_CHECKPOINT._id,
      reflection: "音読が効いた",
    });
  });
});

test("振り返りを書かずに達成にすると reflection は undefined で呼ばれる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("checkbox", { name: `${SOON_CHECKPOINT.content}の達成` }).click();
  const submit = await waitFor(() =>
    getByRole("button", { hidden: true, name: ACHIEVEMENT_REFLECTION_SUBMIT }),
  );
  fireEvent.click(submit);

  await waitFor(() => {
    expect(onSetAchieved).toHaveBeenCalledWith({
      achievedAt: TODAY,
      goalId: SOON_CHECKPOINT._id,
      reflection: undefined,
    });
  });
});

test("達成の取り消しは振り返りを聞かずに即呼ばれる", () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, ACHIEVED_CHECKPOINT])} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();
  getByRole("checkbox", { hidden: true, name: `${ACHIEVED_CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED_CHECKPOINT._id,
  });
});

test("達成したチェックポイントは親グループから消え、達成した目標に集まる", () => {
  const { getByRole, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT, ACHIEVED_CHECKPOINT])} />,
  );
  const group = within(getByRole("region", { name: `${EXAM_GOAL.content}のチェックポイント` }));
  expect(group.queryByText(ACHIEVED_CHECKPOINT.content)).toBeNull();

  const accordion = getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) });
  expect(within(accordion).getByText("1")).toBeDefined();
  expect(queryByRole("region", { name: new RegExp(ACHIEVED_SECTION_TITLE) })).toBeNull();
});

test("達成した目標を開くと親名つきの行と達成日が出る", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, ACHIEVED_CHECKPOINT])} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByText("達成 2026-08-09")).toBeDefined();
  });
  expect(getByText(`親: ${EXAM_GOAL.content}`)).toBeDefined();
});

test("達成済みだが未達成の子が残る長期目標はツリーに残り、バッジが出る", () => {
  const achievedParent = { ...LONG_TERM_GOAL, achievedAt: "2026-08-09" } satisfies Goal;
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([achievedParent, LONG_TERM_CHECKPOINT])} />,
  );
  expect(getByText(ACHIEVED_BADGE_LABEL)).toBeDefined();
  expect(
    getByRole("region", { name: `${LONG_TERM_GOAL.content}のチェックポイント` }),
  ).toBeDefined();
});

test("長期目標が0件でも見出しと追加導線は出る", () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />,
  );
  expect(getByRole("region", { name: LONG_TERM_SECTION_TITLE })).toBeDefined();
  expect(getByRole("button", { name: LONG_TERM_ADD_LABEL })).toBeDefined();
  expect(getByText(LONG_TERM_EMPTY_MESSAGE)).toBeDefined();
});

test("長期目標の追加フォームは期限欄を持たない", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />,
  );
  getByRole("button", { name: LONG_TERM_ADD_LABEL }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: "長期目標の内容" })).toBeDefined();
  });
  expect(queryByLabelText(/期限/)).toBeNull();
});

test("長期目標を作ると期限も親も付けずに送信される", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  getByRole("button", { name: LONG_TERM_ADD_LABEL }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "長期目標の内容" })).toBeDefined();
  });

  fireEvent.change(getByRole("textbox", { name: "長期目標の内容" }), {
    target: { value: LONG_TERM_GOAL.content },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: LONG_TERM_GOAL.criterion },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onCreateGoal).toHaveBeenCalledWith({
      content: LONG_TERM_GOAL.content,
      criterion: LONG_TERM_GOAL.criterion,
      deadline: undefined,
      parentGoalId: undefined,
      type: "mastery",
    });
  });
});

test("親ごとの追加導線からフォームが開き、期限の既定が次の日曜になる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, LONG_TERM_GOAL])} />,
  );
  getByRole("button", { name: addCheckpointName(LONG_TERM_GOAL.content) }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: "チェックポイントの内容" })).toBeDefined();
  });
  const group = within(
    getByRole("region", { name: `${LONG_TERM_GOAL.content}のチェックポイント` }),
  );
  expect(group.getByDisplayValue(NEXT_SUNDAY)).toBeDefined();

  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: LONG_TERM_CHECKPOINT.content },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: LONG_TERM_CHECKPOINT.criterion },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onCreateGoal).toHaveBeenCalledWith({
      content: LONG_TERM_CHECKPOINT.content,
      criterion: LONG_TERM_CHECKPOINT.criterion,
      deadline: NEXT_SUNDAY,
      parentGoalId: LONG_TERM_GOAL._id,
      type: "mastery",
    });
  });
});

test("crowded の助言は親ごとに数える(別の親では出ない)", async () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT, LATER_CHECKPOINT, LONG_TERM_GOAL])}
    />,
  );
  getByRole("button", { name: addCheckpointName(EXAM_GOAL.content) }).click();
  await waitFor(() => {
    expect(getByText(CHECKPOINT_CROWDED_MESSAGE)).toBeDefined();
  });

  getByRole("button", { name: "キャンセル" }).click();
  await waitFor(() => {
    expect(queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
  });

  getByRole("button", { name: addCheckpointName(LONG_TERM_GOAL.content) }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "チェックポイントの内容" })).toBeDefined();
  });
  expect(queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
});

test("チェックポイントの編集で期限を消すと長期目標への移行を予告する", async () => {
  const { findByText, getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${SOON_CHECKPOINT.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "チェックポイントの内容" })).toBeDefined();
  });

  getByRole("button", { name: /期限.*を消す/ }).click();
  expect(await findByText("保存すると期限が外れ、長期目標へ移ります")).toBeDefined();
});

test("子を持つ長期目標の編集では期限を付けられない", async () => {
  const { getByLabelText, getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([LONG_TERM_GOAL, LONG_TERM_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${LONG_TERM_GOAL.content}を編集` }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: "長期目標の内容" })).toBeDefined();
  });
  expect(
    getByText("子チェックポイントを持つ長期目標は、チェックポイントにできません"),
  ).toBeDefined();
  expect((getByLabelText(/期限/) as HTMLButtonElement).disabled).toBe(true);
});

test("編集を保存すると onUpdateGoal が移行なしのトースト文言つきで呼ばれる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${SOON_CHECKPOINT.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "チェックポイントの内容" })).toBeDefined();
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onUpdateGoal).toHaveBeenCalledWith(
      {
        goal: {
          content: SOON_CHECKPOINT.content,
          criterion: SOON_CHECKPOINT.criterion,
          deadline: SOON_CHECKPOINT.deadline,
          parentGoalId: EXAM_GOAL._id,
          type: "mastery",
        },
        goalId: SOON_CHECKPOINT._id,
      },
      "目標を更新しました",
    );
  });
});

test("削除は Confirm を出し、キャンセルでは mutation を呼ばない", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([LONG_TERM_GOAL, LONG_TERM_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${LONG_TERM_GOAL.content}を削除` }).click();

  await waitFor(() => {
    expect(getByText("長期目標を削除しますか？")).toBeDefined();
  });
  expect(getByText(/ひもづくチェックポイント 1件/)).toBeDefined();

  getByRole("button", { name: "キャンセル" }).click();
  expect(onRemoveGoal).not.toHaveBeenCalled();
});

test("Confirm を確定すると onRemoveGoal が目標IDで呼ばれる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  getByRole("button", { name: `${SOON_CHECKPOINT.content}を削除` }).click();

  await waitFor(() => {
    expect(getByRole("button", { name: "削除する" })).toBeDefined();
  });
  getByRole("button", { name: "削除する" }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(SOON_CHECKPOINT._id);
});

test("親のないチェックポイントは孤児の Alert に出る", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, ORPHAN_CHECKPOINT])} />,
  );
  expect(getByText(ORPHAN_CHECKPOINTS_TITLE)).toBeDefined();
  expect(getByText(ORPHAN_CHECKPOINTS_MESSAGE)).toBeDefined();
  expect(getByText(ORPHAN_CHECKPOINT.content)).toBeDefined();
});

test("孤児が無ければ Alert は出ない", () => {
  const { queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  expect(queryByText(ORPHAN_CHECKPOINTS_TITLE)).toBeNull();
});

test("本番目標が無ければ空状態から作成でき、チェックポイントの導線は出ない", async () => {
  const { getByRole, getByText, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([])} />,
  );
  expect(getByText(EXAM_GOAL_EMPTY_TITLE)).toBeDefined();
  expect(queryByRole("button", { name: /チェックポイントを追加/ })).toBeNull();

  getByRole("button", { name: "本番目標を作成する" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "目標スコア下限" })).toBeDefined();
  });
  expect(queryByRole("button", { name: "本番目標を作成する" })).toBeNull();
});

test("障害プランの追加・更新・削除ができる", async () => {
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL])}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: THEN_ACTION }]}
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

test("週間ターゲット設定ボタンで週間ターゲットへスクロールする", () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;

  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  getByRole("button", { name: "週間ターゲットを設定する" }).click();
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});

test("追加フォームには対象項目の欄が出て、カタログの項目から選べる", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL])} />);
  getByRole("button", { name: LONG_TERM_ADD_LABEL }).click();

  await waitFor(() => {
    expect(getByRole("combobox", { name: /実績に数える項目/ })).toBeDefined();
  });
  expect(getByRole("option", { hidden: true, name: KINFURE_ITEM.name })).toBeDefined();
});

test("対象項目つきのチェックポイント行は項目名を実績の前に出す", () => {
  const { getByText } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL, { ...SOON_CHECKPOINT, scopeItemIds: [KINFURE_ITEM._id] }])}
    />,
  );
  expect(
    getByText(
      `${KINFURE_ITEM.name}・確定 ${String(SOON_CHECKPOINT.confirmedMinutes)}分 / ${String(SOON_CHECKPOINT.activeDays)}日`,
    ),
  ).toBeDefined();
});

test("本番日を過ぎた本番目標は「結果を入れる」からモーダルで結果を記録する", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([PAST_EXAM_GOAL])} />);
  getByRole("button", { name: examResultActionName(PAST_EXAM_GOAL) }).click();
  const score = await waitFor(() =>
    getByRole("textbox", { hidden: true, name: EXAM_RESULT_SCORE_LABEL }),
  );
  fireEvent.change(score, { target: { value: "855" } });
  fireEvent.click(getByRole("button", { hidden: true, name: EXAM_RESULT_SUBMIT }));

  await waitFor(() => {
    expect(onSetExamResult).toHaveBeenCalledWith(
      { goalId: PAST_EXAM_GOAL._id, result: { recordedAt: TODAY, score: 855 } },
      EXAM_RESULT_RECORDED_MESSAGE,
    );
  });
});

test("終了した本番だけなら次の本番を作る導線が出て、本番は達成した目標に並ぶ", () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([FINISHED_EXAM_GOAL, ACHIEVED_CHECKPOINT])} />,
  );
  expect(getByText(NEXT_EXAM_TITLE)).toBeDefined();
  expect(getByText(/前回の本番（2026-08-10）の結果は 875 点でした/)).toBeDefined();
  expect(getByRole("button", { name: CREATE_EXAM_LABEL })).toBeDefined();
  expect(queryByText(EXAM_GOAL_INCOMPLETE_TITLE)).toBeNull();
  expect(queryByText(EXAM_GOAL_FINISHED_BADGE)).toBeNull();
  const control = getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) });
  expect(within(control).getByText("2")).toBeDefined();
});

test("未達成の子が残る終了した本番はツリーに残り、追加は出さず、訂正はモーダルを開く", async () => {
  const { getByRole, getByText, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([FINISHED_EXAM_GOAL, SOON_CHECKPOINT])} />,
  );
  expect(getByText(NEXT_EXAM_TITLE)).toBeDefined();
  expect(getByText(EXAM_GOAL_FINISHED_BADGE)).toBeDefined();
  const group = within(
    getByRole("region", { name: `${FINISHED_EXAM_GOAL.content}のチェックポイント` }),
  );
  expect(group.getByText(SOON_CHECKPOINT.content)).toBeDefined();
  expect(queryByRole("button", { name: addCheckpointName(FINISHED_EXAM_GOAL.content) })).toBeNull();

  getByRole("button", { name: examResultActionName(FINISHED_EXAM_GOAL) }).click();
  const score = await waitFor(
    () => getByRole("textbox", { hidden: true, name: EXAM_RESULT_SCORE_LABEL }) as HTMLInputElement,
  );
  expect(score.value).toBe("875");
  fireEvent.change(score, { target: { value: "880" } });
  fireEvent.click(getByRole("button", { hidden: true, name: EXAM_RESULT_SUBMIT }));

  await waitFor(() => {
    expect(onSetExamResult).toHaveBeenCalledWith(
      { goalId: FINISHED_EXAM_GOAL._id, result: { recordedAt: "2026-08-16", score: 880 } },
      EXAM_RESULT_CORRECTED_MESSAGE,
    );
  });
});
