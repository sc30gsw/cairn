import { expect, test } from "vite-plus/test";

import { BreakdownTable } from "~/features/history/components/breakdown-table";
import { renderWithMantine } from "~/test-utils/render";

test("確定行は完了ラベルと確定比を表示する", () => {
  const { getByText } = renderWithMantine(
    <BreakdownTable
      confirmedMinutes={60}
      rows={[
        {
          category: "多聴",
          itemName: "Distinction 2000",
          minutes: 30,
          status: "確定",
        },
        {
          category: "英会話",
          itemName: "英会話",
          minutes: 20,
          status: "スキップ",
        },
      ]}
    />,
  );

  expect(getByText("完了")).toBeDefined();
  expect(getByText("見送り")).toBeDefined();
  expect(getByText("50%")).toBeDefined();
  expect(getByText(/確定合計（60分）/)).toBeDefined();
});
