import { screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import type { ExamGoal } from "~/features/goals/types/goal";
import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import { renderWithMantine } from "~/test-utils/render";

const examGoal = {
  _id: "goal_exam_1" as ExamGoal["_id"],
  content: "司法試験",
  examDate: "2026-12-01",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies ExamGoal;

test("TodaySummaryContent は本番目標がないときプレースホルダを表示する", () => {
  renderWithMantine(<TodaySummaryContent examGoal={undefined} targets={[]} today="2026-08-22" />);

  expect(
    screen.getByText(
      "本番目標を設定すると、試験日までの残り日数と今週の達成状況がここに表示されます。",
    ),
  ).toBeDefined();
});

test("TodaySummaryContent は本番目標と残り日数・週間ターゲット達成数を表示する", () => {
  renderWithMantine(
    <TodaySummaryContent
      examGoal={examGoal}
      targets={[{ achieved: true }, { achieved: false }]}
      today="2026-08-22"
    />,
  );

  expect(screen.getByText("司法試験")).toBeDefined();
  expect(screen.getByText("101")).toBeDefined();
  expect(screen.getByText("今週の週間ターゲット: 1/2 達成")).toBeDefined();
});

test("TodaySummaryContent は本番日を過ぎているときその旨を表示する", () => {
  renderWithMantine(<TodaySummaryContent examGoal={examGoal} targets={[]} today="2027-01-01" />);

  expect(screen.getByText("本番日を過ぎています。")).toBeDefined();
});
