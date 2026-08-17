import { expect, test } from "vite-plus/test";

import { WeeklyProgressCard } from "~/components/weekly-progress-card";
import { renderWithMantine } from "~/test-utils/render";

test("週間ゴールが未設定なら未設定の文言を出す", () => {
  const { getByText } = renderWithMantine(
    <WeeklyProgressCard
      minutesByDate={{}}
      todayJst="2026-08-17"
      weekEndJst="2026-08-23"
      weeklyGoal={null}
    />,
  );
  expect(getByText("週間ゴールが未設定です。")).toBeDefined();
});

test("最低分数に届いた実施日数と今日の到達状況を表示する", () => {
  const { getByText } = renderWithMantine(
    <WeeklyProgressCard
      minutesByDate={{ "2026-08-15": 30, "2026-08-16": 10, "2026-08-17": 25 }}
      todayJst="2026-08-17"
      weekEndJst="2026-08-23"
      weeklyGoal={{ dailyFloorMinutes: 20, days: 3 }}
    />,
  );
  expect(getByText("実施日 2/3 日")).toBeDefined();
  expect(getByText("1日 20分以上")).toBeDefined();
  expect(getByText("今日 25分（実施日に到達）")).toBeDefined();
  expect(getByText(/残り 1 日 \/ 今週はあと \d+ 日/)).toBeDefined();
  expect(getByText("今週の合計 65分")).toBeDefined();
});

test("今日の分数がフロアに届いていなければ残り分数を示す", () => {
  const { getByText } = renderWithMantine(
    <WeeklyProgressCard
      minutesByDate={{ "2026-08-17": 5 }}
      todayJst="2026-08-17"
      weekEndJst="2026-08-23"
      weeklyGoal={{ dailyFloorMinutes: 20, days: 3 }}
    />,
  );
  expect(getByText("今日 5分（あと 15分で実施日）")).toBeDefined();
});

test("実施日がゴール日数に達したら達成の文言になる", () => {
  const { getByText } = renderWithMantine(
    <WeeklyProgressCard
      minutesByDate={{ "2026-08-15": 30, "2026-08-16": 30, "2026-08-17": 30 }}
      todayJst="2026-08-17"
      weekEndJst="2026-08-23"
      weeklyGoal={{ dailyFloorMinutes: 20, days: 3 }}
    />,
  );
  expect(getByText("今週のゴールを達成しました。")).toBeDefined();
});
