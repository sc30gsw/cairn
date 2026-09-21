import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanGoalsReadCard } from "~/components/plan-goals-read-card";
import { renderWithMantine } from "~/test-utils/render";

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
  const { getByRole, getByText, queryByRole } = renderWithMantine(
    <PlanGoalsReadCard goals={[EXAM, CHECKPOINT, LONG_TERM]} />,
  );

  expect(getByRole("heading", { name: "目標" })).toBeDefined();
  expect(getByText("内容")).toBeDefined();
  expect(getByText(EXAM.content)).toBeDefined();
  expect(getByText("本番日")).toBeDefined();
  expect(getByText(EXAM.examDate)).toBeDefined();
  expect(getByText("期限")).toBeDefined();
  expect(getByText(CHECKPOINT.deadline)).toBeDefined();
  expect(getByText(LONG_TERM.content)).toBeDefined();

  expect(getByRole("link", { name: "目標ページで編集" })).toHaveProperty("href", expect.stringMatching(/\/goals$/));

  expect(queryByRole("button", { name: /追加/ })).toBeNull();
  expect(queryByRole("button", { name: /保存/ })).toBeNull();
  expect(queryByRole("button", { name: /削除/ })).toBeNull();
  expect(queryByRole("button", { name: /達成/ })).toBeNull();
  expect(queryByRole("textbox")).toBeNull();
});

test("目標が無いときは読み取り専用の空を出す", () => {
  const { getByText, queryByRole } = renderWithMantine(<PlanGoalsReadCard goals={[]} />);
  expect(getByText("目標はまだありません。")).toBeDefined();
  expect(queryByRole("button", { name: /追加/ })).toBeNull();
});
