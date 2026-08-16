import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { BreakdownTable } from "~/features/history/components/breakdown-table";
import type { BreakdownRow } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed] = STATUSES;

test("完了行の項目・分数・確定比を表示する", () => {
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
      minutes: 30,
      status: confirmed,
    },
  ] as const satisfies readonly BreakdownRow[];

  const { getByText, queryByText } = renderWithMantine(
    <BreakdownTable confirmedMinutes={60} rows={rows} />,
  );

  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("英会話")).toBeDefined();
  expect(getByText("50%")).toBeDefined();
  expect(getByText(/確定合計（60分）/)).toBeDefined();
  expect(queryByText("見送り")).toBeNull();
  expect(queryByText("状態")).toBeNull();
});

test("完了行がないときは空メッセージを出す", () => {
  const { getByText } = renderWithMantine(<BreakdownTable confirmedMinutes={0} rows={[]} />);
  expect(getByText("完了した記録がありません。")).toBeDefined();
});
