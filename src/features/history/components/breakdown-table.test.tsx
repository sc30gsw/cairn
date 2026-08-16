import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { BreakdownTable } from "~/features/history/components/breakdown-table";
import type { BreakdownRow } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, skipped] = [STATUSES[0], STATUSES[2]] as const;

test("確定行は完了ラベルと確定比を表示する", () => {
  const rows = [
    {
      category: "多聴",
      itemName: "Distinction 2000",
      minutes: 30,
      status: confirmed,
    },
    {
      category: "英会話",
      itemName: "英会話",
      minutes: 20,
      status: skipped,
    },
  ] as const satisfies readonly BreakdownRow[];

  const { getByText } = renderWithMantine(<BreakdownTable confirmedMinutes={60} rows={rows} />);

  expect(getByText("完了")).toBeDefined();
  expect(getByText("見送り")).toBeDefined();
  expect(getByText("50%")).toBeDefined();
  expect(getByText(/確定合計（60分）/)).toBeDefined();
});
