import { expect, test } from "vite-plus/test";

import { DayPagePending } from "~/features/today/components/day-page-pending";
import { renderWithMantine } from "~/test-utils/render";

test("DayPagePending は Distinction 2000 の shimmer を出す", () => {
  const { getAllByText } = renderWithMantine(<DayPagePending dateJst="2026-08-17" />);
  expect(getAllByText("Distinction 2000").length).toBeGreaterThan(0);
});
