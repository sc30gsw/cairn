import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import type { Goal, WeeklyTrendWeek } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

const EXAM_GOAL = {
  _id: "goal-exam" as Goal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies Goal;

const PACE_GOAL = {
  _id: "goal-pace" as Goal["_id"],
  content: "帰宅後に Distinction を1セット解く",
  dailyFloorMinutes: 20,
  daysPerWeek: 3,
  type: "pace",
} satisfies Goal;

const VOLUME_GOAL = {
  _id: "goal-volume" as Goal["_id"],
  content: "公式問題集を1回分ずつ解く",
  currentAmount: 3,
  deadline: "2026-09-20",
  startAmount: 0,
  targetAmount: 10,
  type: "volume",
  unit: "回",
} satisfies Goal;

const MASTERY_GOAL = {
  _id: "goal-mastery" as Goal["_id"],
  content: "Unit 1-10 を音読する",
  criterion: "止まらずに音読できる",
  deadline: undefined,
  type: "mastery",
} satisfies Goal;

const OTHER_GOAL = {
  _id: "goal-other" as Goal["_id"],
  content: "毎朝の英字ニュースを1本読む",
  deadline: undefined,
  memo: "5分で十分",
  type: "other",
} satisfies Goal;

function makeTrendWeek(weekIndex: number, achieved: boolean): WeeklyTrendWeek {
  return {
    achieved,
    dailyFloorMinutes: 20,
    goalDays: 3,
    qualifyingDays: achieved ? 4 : 1,
    volumeMinutes: achieved ? 320 : 60,
    weekEnd: `2026-07-${String(10 + weekIndex).padStart(2, "0")}`,
    weekStart: `2026-07-${String(4 + weekIndex).padStart(2, "0")}`,
  };
}

function goalsBoardProps(goals: Goal[], trendWeeks: WeeklyTrendWeek[]) {
  return {
    goals,
    minutesByDate: { "2026-08-17": 30 },
    obstacles: [],
    onCreateGoal: vi.fn(),
    onCreateObstacle: vi.fn(),
    onRemoveGoal: vi.fn(),
    onRemoveObstacle: vi.fn(),
    onSaveWeekly: vi.fn(),
    onSetVolumeProgress: vi.fn(),
    onUpdateGoal: vi.fn(),
    onUpdateObstacle: vi.fn(),
    todayJst: "2026-08-17",
    trendWeeks,
    weekEndJst: "2026-08-23",
    weeklyGoal: { dailyFloorMinutes: 20, days: 3 },
    weeklyTargets: {
      categories: [],
      onRemoveTarget: vi.fn(),
      onSaveTarget: vi.fn(),
      targets: [],
    },
  };
}

test("2週連続達成でストリークバッジが出る", () => {
  const trendWeeks = [makeTrendWeek(1, true), makeTrendWeek(0, true)];
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, PACE_GOAL], trendWeeks)} />,
  );
  expect(getByText("2週連続達成中")).toBeDefined();
});

test("未達1週を挟んでも予備で連続が続き、予備バッジが出る", () => {
  const trendWeeks = [makeTrendWeek(2, true), makeTrendWeek(1, false), makeTrendWeek(0, true)];
  const { getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, PACE_GOAL], trendWeeks)} />,
  );
  expect(getByText("2週連続達成中")).toBeDefined();
  expect(getByText("予備を1回使用")).toBeDefined();
});

test("1週だけの達成ではストリークバッジを出さない", () => {
  const trendWeeks = [makeTrendWeek(0, true)];
  const { queryByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL, PACE_GOAL], trendWeeks)} />,
  );
  expect(queryByText(/週連続達成中/)).toBeNull();
});

test("カウントダウンと週間進捗と障害プランが見える", () => {
  const { getByRole, getByText } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([EXAM_GOAL, PACE_GOAL], [])}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: THEN_ACTION }]}
    />,
  );
  expect(getByText(/2026-09-27 まであと 41 日/)).toBeDefined();
  expect(getByText(/730/)).toBeDefined();
  expect(getByText(/実施日 1\/3 日/)).toBeDefined();
  expect(getByText(/もし 眠い なら Unit 3 の例文を声に出して5文読む/)).toBeDefined();
  expect(getByRole("button", { name: "障害プランを追加" })).toBeDefined();
  expect(getByRole("button", { name: "眠いを保存" })).toBeDefined();
});

test("ペース目標が無ければ設定を促す", () => {
  const { getAllByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([EXAM_GOAL], [])} />);
  expect(getAllByRole("button", { name: "ペース目標を作成する" }).length).toBeGreaterThan(0);
});

test("目標がゼロ件なら空状態を出す", () => {
  const { getByText } = renderWithMantine(<GoalsBoard {...goalsBoardProps([], [])} />);
  expect(getByText("目標がまだありません")).toBeDefined();
});

test("達成量・習得・その他のカードが表示される", () => {
  const { getAllByText, getByText } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL, VOLUME_GOAL, MASTERY_GOAL, OTHER_GOAL], [])} />,
  );
  expect(getByText("公式問題集を1回分ずつ解く")).toBeDefined();
  expect(getByText(/3 \/ 10回（30%）/)).toBeDefined();
  expect(getByText("基準: 止まらずに音読できる")).toBeDefined();
  expect(getByText("5分で十分")).toBeDefined();
  //? 習得・その他はどちらも期限なし(deadline: undefined)なので2件出る
  expect(getAllByText("期限なし").length).toBe(2);
});

test("編集アイコンを押すと既存の値でフォームが開く", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} />);
  getByRole("button", { name: "帰宅後に Distinction を1セット解くを編集" }).click();
  await waitFor(() => {
    expect((getByRole("textbox", { name: "週の実施日数" }) as HTMLInputElement).value).toBe("3 日");
  });
  expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
});

test("削除アイコンを押すと onRemoveGoal が目標IDで呼ばれる", () => {
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} onRemoveGoal={onRemoveGoal} />,
  );
  getByRole("button", { name: "帰宅後に Distinction を1セット解くを削除" }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(PACE_GOAL._id);
});

test("週間ゴールの今週だけの調整を保存すると onSaveWeekly が呼ばれる", async () => {
  const onSaveWeekly = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} onSaveWeekly={onSaveWeekly} />,
  );
  fireEvent.change(getByRole("textbox", { name: "今週の実施日数" }), { target: { value: "5" } });
  fireEvent.change(getByRole("textbox", { name: "1日あたり最低分数" }), {
    target: { value: "15" },
  });
  getByRole("button", { name: "週間ゴールを保存" }).click();
  await waitFor(() => {
    expect(onSaveWeekly).toHaveBeenCalled();
  });
  expect(onSaveWeekly.mock.calls[0]?.[0]).toEqual({ dailyFloorMinutes: 15, days: 5 });
});

test("未達バナーから障害プランへスクロールする", () => {
  const scrollIntoView = vi.fn();
  vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(scrollIntoView);
  const trendWeeks = [makeTrendWeek(0, false)];
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL], trendWeeks)} />,
  );
  getByRole("button", { name: "障害プランを作成する" }).click();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("既存の障害プランを更新・削除できる", async () => {
  const onUpdateObstacle = vi.fn();
  const onRemoveObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([PACE_GOAL], [])}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: THEN_ACTION }]}
      onRemoveObstacle={onRemoveObstacle}
      onUpdateObstacle={onUpdateObstacle}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "眠いのもし" }), {
    target: { value: "とても眠い" },
  });
  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).toHaveBeenCalledWith({
      ifText: "とても眠い",
      planId: "o1",
      thenText: THEN_ACTION,
    });
  });

  getByRole("button", { name: "削除" }).click();
  expect(onRemoveObstacle).toHaveBeenCalledWith("o1");
});

test("「目標を追加」を押すとペース未設定なら作成フォームが開き、キャンセルで閉じる", async () => {
  const { getByRole, queryByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([], [])} />);
  getByRole("button", { name: "目標を追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "週の実施日数" })).toBeDefined();
  });
  expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(false);

  getByRole("button", { name: "キャンセル" }).click();
  await waitFor(() => {
    expect(queryByRole("textbox", { name: "週の実施日数" })).toBeNull();
  });
});

test("ペース設定済みで「目標を追加」を押すと達成量タイプの作成フォームが開く", async () => {
  const { getByRole } = renderWithMantine(<GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} />);
  getByRole("button", { name: "目標を追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "目標量" })).toBeDefined();
  });
});

test("ペース目標を作成すると onCreateGoal が呼ばれてフォームが閉じる", async () => {
  const onCreateGoal = vi.fn();
  const { getAllByRole, getByRole, queryByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([], [])} onCreateGoal={onCreateGoal} />,
  );
  getByRole("button", { name: "目標を追加" }).click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "週の実施日数" })).toBeDefined();
  });
  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "帰宅後に Distinction を1セット解く" },
  });
  fireEvent.change(getByRole("textbox", { name: "週の実施日数" }), { target: { value: "3" } });
  //? 「1日あたり最低分数」は作成フォームと常設の WeeklyGoalPanel の両方にあるラベル。
  //? 描画順で先に出る1件目(作成フォーム側)を操作する。
  const [dailyFloorMinutesInput] = getAllByRole("textbox", { name: "1日あたり最低分数" });
  if (dailyFloorMinutesInput === undefined) {
    throw new Error("作成フォームの「1日あたり最低分数」が見つかりません");
  }
  fireEvent.change(dailyFloorMinutesInput, { target: { value: "20" } });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onCreateGoal).toHaveBeenCalledWith({
      content: "帰宅後に Distinction を1セット解く",
      dailyFloorMinutes: 20,
      daysPerWeek: 3,
      type: "pace",
    });
  });
  expect(queryByRole("textbox", { name: "週の実施日数" })).toBeNull();
});

test("ペース目標を編集して保存し直すと onUpdateGoal が目標IDとともに呼ばれる", async () => {
  const onUpdateGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} onUpdateGoal={onUpdateGoal} />,
  );
  getByRole("button", { name: "帰宅後に Distinction を1セット解くを編集" }).click();
  await waitFor(() => {
    expect((getByRole("textbox", { name: "週の実施日数" }) as HTMLInputElement).value).toBe("3 日");
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onUpdateGoal).toHaveBeenCalledWith({
      goal: {
        content: PACE_GOAL.content,
        dailyFloorMinutes: PACE_GOAL.dailyFloorMinutes,
        daysPerWeek: PACE_GOAL.daysPerWeek,
        type: "pace",
      },
      goalId: PACE_GOAL._id,
    });
  });
});

test("本番目標カードの編集・削除アイコンが動く", async () => {
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL], [])} onRemoveGoal={onRemoveGoal} />,
  );
  getByRole("button", { name: `${EXAM_GOAL.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
  });

  getByRole("button", { name: `${EXAM_GOAL.content}を削除` }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(EXAM_GOAL._id);
});

test("本番目標カードの「ペース目標を作成する」を押すとペース作成フォームが開く", async () => {
  //? ペース未設定だと本番目標カード自身のナッジと、下部の「ペース目標が未設定です」
  //? パネルの両方に同名ボタンが出る(docs/adr/0003)。カード側は描画順で先に出る1件目。
  const { getAllByRole, getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([EXAM_GOAL], [])} />,
  );
  const [examCardButton] = getAllByRole("button", { name: "ペース目標を作成する" });
  examCardButton?.click();
  await waitFor(() => {
    expect(getByRole("textbox", { name: "週の実施日数" })).toBeDefined();
  });
});

test("達成量カードの編集・進捗更新・削除アイコンが動く", async () => {
  const onRemoveGoal = vi.fn();
  const onSetVolumeProgress = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([PACE_GOAL, VOLUME_GOAL], [])}
      onRemoveGoal={onRemoveGoal}
      onSetVolumeProgress={onSetVolumeProgress}
    />,
  );

  fireEvent.change(getByRole("textbox", { name: `${VOLUME_GOAL.content}の現在量` }), {
    target: { value: "5" },
  });
  getByRole("button", { name: `${VOLUME_GOAL.content}の進捗を更新` }).click();
  await waitFor(() => {
    expect(onSetVolumeProgress).toHaveBeenCalledWith({
      currentAmount: 5,
      goalId: VOLUME_GOAL._id,
    });
  });

  getByRole("button", { name: `${VOLUME_GOAL.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
  });

  getByRole("button", { name: `${VOLUME_GOAL.content}を削除` }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(VOLUME_GOAL._id);
});

test("習得・その他カードの編集・削除アイコンが動く", async () => {
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      {...goalsBoardProps([PACE_GOAL, MASTERY_GOAL, OTHER_GOAL], [])}
      onRemoveGoal={onRemoveGoal}
    />,
  );

  getByRole("button", { name: `${MASTERY_GOAL.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
  });
  getByRole("button", { name: `${MASTERY_GOAL.content}を削除` }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(MASTERY_GOAL._id);

  getByRole("button", { name: `${OTHER_GOAL.content}を編集` }).click();
  await waitFor(() => {
    expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
  });
  getByRole("button", { name: `${OTHER_GOAL.content}を削除` }).click();
  expect(onRemoveGoal).toHaveBeenCalledWith(OTHER_GOAL._id);
});

test("障害プランを追加したら入力が空に戻る", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard {...goalsBoardProps([PACE_GOAL], [])} onCreateObstacle={onCreateObstacle} />,
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
