import { fireEvent } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import {
  PlanDayScheduleCollapsePanel,
  PlanDayScheduleHeaderButton,
} from "~/features/plan/components/plan-day-schedule-list";
import { renderWithMantine } from "~/test-utils/render";

test("この日の予定は初期状態で閉じている", () => {
  const { queryByText } = renderWithMantine(
    <PlanDayScheduleCollapsePanel
      entries={[{ endTime: "10:00", key: "1", name: "多読", startTime: "09:00" }]}
      opened={false}
    />,
  );

  expect(queryByText("多読")).toBeNull();
});

test("開いたときだけ一覧を見せる", () => {
  const { getByText } = renderWithMantine(
    <PlanDayScheduleCollapsePanel
      entries={[{ endTime: "10:00", key: "1", name: "多読", startTime: "09:00" }]}
      opened
    />,
  );

  expect(getByText("多読")).toBeDefined();
  expect(getByText("09:00–10:00")).toBeDefined();
});

test("ヘッダーボタンで開閉を切り替える", () => {
  const toggles: boolean[] = [];
  const { getByRole } = renderWithMantine(
    <PlanDayScheduleHeaderButton
      dateJst="2026-09-21"
      onToggle={() => {
        toggles.push(true);
      }}
      opened={false}
    />,
  );

  fireEvent.click(getByRole("button", { name: "2026/09/21 の予定を確認します" }));
  expect(toggles).toHaveLength(1);
});

test("開いているときのヘッダー Tooltip は閉じる", () => {
  const { getByRole } = renderWithMantine(
    <PlanDayScheduleHeaderButton dateJst="2026-09-21" onToggle={() => {}} opened />,
  );

  expect(getByRole("button", { name: "予定の確認を閉じます" })).toBeDefined();
});
