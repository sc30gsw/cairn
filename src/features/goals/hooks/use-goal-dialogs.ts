import { useState } from "react";

import {
  EXAM_RESULT_CORRECTED_MESSAGE,
  EXAM_RESULT_RECORDED_MESSAGE,
} from "~/features/goals/lib/exam-result-copy";
import type { ExamResultInput } from "~/features/goals/schemas/exam-result-schema";
import type { ExamGoal, Goal, GoalId, MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput, SetExamResultInput } from "~/features/goals/types/mutations";

type UseGoalDialogsOptions = {
  goals: readonly Goal[];
  onSetAchieved: (input: SetAchievedInput) => Promise<void>;
  onSetExamResult: (input: SetExamResultInput, successMessage: string) => Promise<void>;
};

//? 目標ボードの2つのモーダル（達成の振り返り / 本番の結果）の開閉と送信をまとめる
export function useGoalDialogs({ goals, onSetAchieved, onSetExamResult }: UseGoalDialogsOptions) {
  const [pendingAchievement, setPendingAchievement] = useState<SetAchievedInput | null>(null);
  const [resultGoalId, setResultGoalId] = useState<GoalId | null>(null);

  const reflectionGoal =
    pendingAchievement === null
      ? null
      : (goals.find(
          (candidate): candidate is MasteryGoal =>
            candidate._id === pendingAchievement.goalId && candidate.type === "mastery",
        ) ?? null);
  const resultGoal =
    resultGoalId === null
      ? null
      : (goals.find(
          (candidate): candidate is ExamGoal =>
            candidate._id === resultGoalId && candidate.type === "exam",
        ) ?? null);

  //? 達成にするときだけ振り返りを聞く。達成の取り消しは即反映（振り返りは残る）
  function requestSetAchieved(input: SetAchievedInput) {
    if (input.achievedAt === undefined) {
      onSetAchieved(input);
      return;
    }
    setPendingAchievement(input);
  }

  function submitReflection(reflection: string | undefined) {
    if (pendingAchievement === null) {
      return;
    }
    return onSetAchieved({ ...pendingAchievement, reflection });
  }

  //? 結果は1本番につき1値。最初の記録と訂正でトーストの文言だけを分ける
  function submitExamResult(result: ExamResultInput) {
    if (resultGoal === null) {
      return;
    }
    return onSetExamResult(
      { goalId: resultGoal._id, result },
      resultGoal.result === undefined
        ? EXAM_RESULT_RECORDED_MESSAGE
        : EXAM_RESULT_CORRECTED_MESSAGE,
    );
  }

  return {
    closeReflection: () => setPendingAchievement(null),
    closeResult: () => setResultGoalId(null),
    openResult: (goal: ExamGoal) => setResultGoalId(goal._id),
    reflectionGoal,
    requestSetAchieved,
    resultGoal,
    submitExamResult,
    submitReflection,
  };
}
