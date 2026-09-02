import { Button, Card, EmptyState } from "@mantine/core";
import { IconTarget } from "@tabler/icons-react";

import type { ExamGoal } from "~/features/goals/types/goal";

export const EXAM_GOAL_EMPTY_TITLE = "本番目標がまだありません";
export const NEXT_EXAM_TITLE = "次の本番を作りましょう";
export const CREATE_EXAM_LABEL = "本番目標を作成する";

function nextExamDescription(latest: ExamGoal): string {
  const score = latest.result === undefined ? "" : `の結果は ${latest.result.score} 点でした`;

  return `前回の本番（${latest.examDate}）${score}。次の本番日とスコア帯を決めると、残り日数の軸が戻ります。`;
}

type ExamEmptyCardProps = {
  //? 直近に終了した本番。あれば「次の本番」の導線として前回の結果を添える
  latest: ExamGoal | undefined;
  onCreate: () => void;
};

export function ExamEmptyCard({ latest, onCreate }: ExamEmptyCardProps) {
  return (
    <Card>
      <EmptyState
        description={
          latest === undefined
            ? "本番日とスコア帯を決めると、残り日数の軸ができます。"
            : nextExamDescription(latest)
        }
        icon={<IconTarget aria-hidden />}
        title={latest === undefined ? EXAM_GOAL_EMPTY_TITLE : NEXT_EXAM_TITLE}
      >
        <EmptyState.Actions>
          <Button onClick={onCreate} type="button">
            {CREATE_EXAM_LABEL}
          </Button>
        </EmptyState.Actions>
      </EmptyState>
    </Card>
  );
}
