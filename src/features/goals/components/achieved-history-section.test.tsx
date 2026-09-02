import { waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import {
  ACHIEVED_SECTION_TITLE,
  AchievedHistorySection,
  FINISHED_EXAM_BADGE,
} from "~/features/goals/components/achieved-history-section";
import { examResultActionName } from "~/features/goals/components/exam-goal-card";
import { KINFURE_ITEM, scopeItemsFixture } from "~/features/goals/mocks/goal-scope-fixture";
import type { ExamGoal, MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const ACHIEVED_CHECKPOINT = {
  _id: "goal-achieved" as MasteryGoal["_id"],
  achievedAt: "2026-08-09",
  activeDays: 6,
  confirmedMinutes: 300,
  content: "金のフレーズ Unit 1 を暗唱する",
  createdAt: 1_755_000_000_000,
  criterion: "見ずに Unit 1 を言える",
  deadline: "2026-08-09",
  parentGoalId: "goal-exam" as MasteryGoal["_id"],
  type: "mastery",
} satisfies MasteryGoal;

const ACHIEVED_LONG_TERM = {
  ...ACHIEVED_CHECKPOINT,
  _id: "goal-achieved-long-term" as MasteryGoal["_id"],
  content: "音読を毎日続けられる",
  deadline: undefined,
  parentGoalId: undefined,
} satisfies MasteryGoal;

const FINISHED_EXAM = {
  _id: "goal-exam-finished" as ExamGoal["_id"],
  content: "TOEIC で900点を取る",
  createdAt: 1_754_000_000_000,
  examDate: "2026-08-02",
  maxScore: 900,
  minScore: 850,
  result: { recordedAt: "2026-08-16", score: 875 },
  type: "exam",
} satisfies ExamGoal;

function sectionProps(overrides: Partial<Parameters<typeof AchievedHistorySection>[0]> = {}) {
  return {
    achieved: [ACHIEVED_CHECKPOINT, ACHIEVED_LONG_TERM],
    finishedExams: [],
    form: undefined,
    items: scopeItemsFixture,
    onEditGoal: vi.fn(),
    onRecordResult: vi.fn(),
    onRemoveGoal: vi.fn(),
    onSetAchieved: vi.fn(),
    parentNameOf: (goal: MasteryGoal) =>
      goal.parentGoalId === undefined ? undefined : "TOEIC で900点を取る",
    todayJst: TODAY,
    ...overrides,
  } satisfies Parameters<typeof AchievedHistorySection>[0];
}

test("既定は閉じていて、件数つきの見出しだけを開いていない状態で出す", () => {
  const { getByRole } = renderWithMantine(<AchievedHistorySection {...sectionProps()} />);
  const control = getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) });
  expect(within(control).getByText("2")).toBeDefined();
  expect(control.getAttribute("aria-expanded")).toBe("false");
});

test("達成が1件増えても件数と行が追従する(再描画)", () => {
  const view = renderWithMantine(
    <AchievedHistorySection {...sectionProps({ achieved: [ACHIEVED_CHECKPOINT] })} />,
  );
  expect(
    within(view.getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) })).getByText("1"),
  ).toBeDefined();

  view.rerender(<AchievedHistorySection {...sectionProps()} />);

  expect(
    within(view.getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) })).getByText("2"),
  ).toBeDefined();
});

test("開くと親のある行にだけ親名が付く", async () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <AchievedHistorySection {...sectionProps()} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByText(ACHIEVED_CHECKPOINT.content)).toBeDefined();
  });
  expect(getByText("親: TOEIC で900点を取る")).toBeDefined();
  expect(queryByText(`親: ${ACHIEVED_LONG_TERM.content}`)).toBeNull();
});

test("達成を外すと onSetAchieved が達成日なしで呼ばれる", async () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <AchievedHistorySection {...sectionProps({ onSetAchieved })} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByRole("checkbox", { name: `${ACHIEVED_CHECKPOINT.content}の達成` })).toBeDefined();
  });
  getByRole("checkbox", { name: `${ACHIEVED_CHECKPOINT.content}の達成` }).click();

  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED_CHECKPOINT._id,
  });
});

test("編集フォームは一覧の上に開く", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <AchievedHistorySection {...sectionProps({ form: <div>編集フォーム</div> })} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByText("編集フォーム")).toBeDefined();
  });
});

test("編集と削除のアクションが呼ばれる", async () => {
  const onEditGoal = vi.fn();
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <AchievedHistorySection {...sectionProps({ onEditGoal, onRemoveGoal })} />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByRole("button", { name: `${ACHIEVED_CHECKPOINT.content}を編集` })).toBeDefined();
  });
  getByRole("button", { name: `${ACHIEVED_CHECKPOINT.content}を編集` }).click();
  getByRole("button", { name: `${ACHIEVED_CHECKPOINT.content}を削除` }).click();

  expect(onEditGoal).toHaveBeenCalledWith(ACHIEVED_CHECKPOINT);
  expect(onRemoveGoal).toHaveBeenCalledWith(ACHIEVED_CHECKPOINT);
});

test("達成履歴の行も、凍結時点の対象項目を短縮形で併記する", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <AchievedHistorySection
      {...sectionProps({
        achieved: [{ ...ACHIEVED_CHECKPOINT, scopeItemIds: [KINFURE_ITEM._id] }],
      })}
    />,
  );
  getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) }).click();

  await waitFor(() => {
    expect(getByText("金フレ・確定 300分 / 6日")).toBeDefined();
  });
});

test("終了した本番は件数に含まれ、結果と訂正の導線つきで先頭に並ぶ", async () => {
  const onRecordResult = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <AchievedHistorySection
      {...sectionProps({ finishedExams: [FINISHED_EXAM], onRecordResult })}
    />,
  );
  const control = getByRole("button", { name: new RegExp(ACHIEVED_SECTION_TITLE) });
  expect(within(control).getByText("3")).toBeDefined();
  control.click();

  await waitFor(() => {
    expect(getByText(FINISHED_EXAM.content)).toBeDefined();
  });
  expect(getByText(FINISHED_EXAM_BADGE)).toBeDefined();
  expect(getByText("875点")).toBeDefined();
  expect(getByText("結果 2026-08-16")).toBeDefined();
  const rows = getByRole("list").querySelectorAll("li");
  expect(rows[0]?.textContent).toContain(FINISHED_EXAM.content);

  getByRole("button", { name: examResultActionName(FINISHED_EXAM) }).click();
  expect(onRecordResult).toHaveBeenCalledWith(FINISHED_EXAM);
});
