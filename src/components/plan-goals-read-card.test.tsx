import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanGoalsReadCard } from "~/components/plan-goals-read-card";
import {
  PLAN_GOALS_EDIT_LABEL,
  PLAN_GOALS_EMPTY_MESSAGE,
  toPlanGoalRead,
} from "~/lib/plan-goal-read";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const EXAM = {
  _id: "goal-exam" as Id<"goals">,
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  type: "exam" as const,
};

const CHECKPOINT = {
  _id: "goal-checkpoint" as Id<"goals">,
  content: "Unit 1-10 を音読する",
  deadline: "2026-08-23",
  type: "mastery" as const,
};

const LONG_TERM = {
  _id: "goal-long" as Id<"goals">,
  content: "Distinction の例文を口頭で言い切る",
  type: "mastery" as const,
};

test("本番日・期限・内容だけを読み、CUD は出さない", () => {
  const { getAllByText, getByRole, getByText, queryByRole } = renderWithMantine(
    <PlanGoalsReadCard goals={[EXAM, CHECKPOINT, LONG_TERM]} />,
  );

  expect(getByRole("heading", { name: "目標" })).toBeDefined();
  expect(getAllByText("内容")).toHaveLength(3);
  expect(getByText(EXAM.content)).toBeDefined();
  expect(getByText("本番日")).toBeDefined();
  expect(getByText(EXAM.examDate)).toBeDefined();
  expect(getByText("期限")).toBeDefined();
  expect(getByText(CHECKPOINT.deadline)).toBeDefined();
  expect(getByText(LONG_TERM.content)).toBeDefined();

  expect(
    (getByRole("link", { name: PLAN_GOALS_EDIT_LABEL }) as HTMLAnchorElement).getAttribute("href"),
  ).toBe("/goals");

  expect(queryByRole("button", { name: /追加/ })).toBeNull();
  expect(queryByRole("button", { name: /保存/ })).toBeNull();
  expect(queryByRole("button", { name: /削除/ })).toBeNull();
  expect(queryByRole("button", { name: /達成/ })).toBeNull();
  expect(queryByRole("textbox")).toBeNull();
});

test("目標が無いときは読み取り専用の空を出す", () => {
  const { getByText, queryByRole } = renderWithMantine(<PlanGoalsReadCard goals={[]} />);
  expect(getByText(PLAN_GOALS_EMPTY_MESSAGE)).toBeDefined();
  expect(queryByRole("button", { name: /追加/ })).toBeNull();
});

test("計画の目標読み取りは本番日・期限・内容だけを残す", () => {
  expect(
    toPlanGoalRead({
      _id: EXAM._id,
      content: EXAM.content,
      createdAt: 1,
      examDate: EXAM.examDate,
      maxScore: 850,
      minScore: 730,
      type: "exam",
    }),
  ).toEqual({
    _id: EXAM._id,
    content: EXAM.content,
    examDate: EXAM.examDate,
    type: "exam",
  });
  expect(
    toPlanGoalRead({
      _id: CHECKPOINT._id,
      achievedAt: undefined,
      activeDays: 0,
      confirmedMinutes: 0,
      content: CHECKPOINT.content,
      createdAt: 1,
      criterion: "止まらずに音読できる",
      deadline: CHECKPOINT.deadline,
      type: "mastery",
    }),
  ).toEqual({
    _id: CHECKPOINT._id,
    content: CHECKPOINT.content,
    deadline: CHECKPOINT.deadline,
    type: "mastery",
  });
});
