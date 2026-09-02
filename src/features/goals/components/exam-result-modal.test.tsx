import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { TOEIC_SCORE_STEP_MESSAGE } from "~domain/domain";

import {
  EXAM_RESULT_CORRECT_TITLE,
  EXAM_RESULT_MODAL_TITLE,
  EXAM_RESULT_SCORE_LABEL,
  EXAM_RESULT_SUBMIT,
  ExamResultModal,
} from "~/features/goals/components/exam-result-modal";
import type { ExamGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-10-20";

const EXAM_GOAL = {
  _id: "goal-exam" as ExamGoal["_id"],
  content: "本番で900点を取る",
  createdAt: 1_755_000_000_000,
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} satisfies ExamGoal;

function modalProps(overrides: Partial<Parameters<typeof ExamResultModal>[0]> = {}) {
  return {
    goal: EXAM_GOAL,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    todayJst: TODAY,
    ...overrides,
  } satisfies Parameters<typeof ExamResultModal>[0];
}

function scoreInput(getByRole: ReturnType<typeof renderWithMantine>["getByRole"]) {
  return getByRole("textbox", { hidden: true, name: EXAM_RESULT_SCORE_LABEL }) as HTMLInputElement;
}

test("goal が無ければ何も出さない", () => {
  const { queryByText } = renderWithMantine(<ExamResultModal {...modalProps({ goal: null })} />);
  expect(queryByText(EXAM_RESULT_MODAL_TITLE)).toBeNull();
});

test("スコアを入れて保存すると、今日を入れた日として onSubmit が呼ばれ閉じる", async () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const { getByRole, getByText } = renderWithMantine(
    <ExamResultModal {...modalProps({ onClose, onSubmit })} />,
  );
  expect(getByText(EXAM_RESULT_MODAL_TITLE)).toBeDefined();
  expect(getByText(/「本番で900点を取る」（本番日 2026-10-01、目標 800〜900/)).toBeDefined();

  fireEvent.change(scoreInput(getByRole), { target: { value: "855" } });
  fireEvent.click(getByRole("button", { hidden: true, name: EXAM_RESULT_SUBMIT }));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({ recordedAt: TODAY, score: 855 });
  });
  expect(onClose).toHaveBeenCalledOnce();
});

test("5 点刻みでないスコアはドメインの文言で止まり、onSubmit は呼ばれない", async () => {
  const onSubmit = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <ExamResultModal {...modalProps({ onSubmit })} />,
  );

  fireEvent.change(scoreInput(getByRole), { target: { value: "857" } });
  fireEvent.click(getByRole("button", { hidden: true, name: EXAM_RESULT_SUBMIT }));

  await waitFor(() => {
    expect(getByText(TOEIC_SCORE_STEP_MESSAGE)).toBeDefined();
  });
  expect(onSubmit).not.toHaveBeenCalled();
});

test("結果が入っている本番では訂正の題名になり、いまの結果が初期値に入る", () => {
  const { getByRole, getByText } = renderWithMantine(
    <ExamResultModal
      {...modalProps({
        goal: { ...EXAM_GOAL, result: { recordedAt: "2026-10-18", score: 875 } },
      })}
    />,
  );
  expect(getByText(EXAM_RESULT_CORRECT_TITLE)).toBeDefined();
  expect(scoreInput(getByRole).value).toBe("875");
});
