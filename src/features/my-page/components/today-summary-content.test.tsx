import { screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import type { ExamGoal } from "~/features/my-page/types/exam-goal";
import type { TodaySummaryTarget } from "~/features/my-page/types/today-summary-target";
import { renderWithMantine } from "~/test-utils/render";

const examGoal = {
  _id: "goal_exam_1" as ExamGoal["_id"],
  content: "司法試験",
  createdAt: 1_755_000_000_000,
  examDate: "2026-12-01",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies ExamGoal;

const weeklyTargets = [
  {
    _id: "target_1" as TodaySummaryTarget["_id"],
    achieved: true,
    categoryId: "category_1" as TodaySummaryTarget["categoryId"],
    categoryName: "TOEIC対策",
    current: 60,
    metric: "minutes",
    targetValue: 60,
  },
  {
    _id: "target_2" as TodaySummaryTarget["_id"],
    achieved: false,
    categoryId: "category_2" as TodaySummaryTarget["categoryId"],
    categoryName: "多読",
    current: 1,
    metric: "days",
    targetValue: 3,
  },
] satisfies TodaySummaryTarget[];

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
    <TodaySummaryContent examGoal={examGoal} targets={weeklyTargets} today="2026-08-22" />,
  );

  expect(screen.getByText("司法試験")).toBeDefined();
  expect(screen.getByText("101")).toBeDefined();
  expect(screen.getByText("今週の週間ターゲット: 1/2 達成")).toBeDefined();
});

test("TodaySummaryContent は本番日を過ぎているときその旨を表示する", () => {
  renderWithMantine(<TodaySummaryContent examGoal={examGoal} targets={[]} today="2027-01-01" />);

  expect(screen.getByText("本番日を過ぎています。")).toBeDefined();
});
