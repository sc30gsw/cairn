import { expect, test, vi } from "vite-plus/test";

import { DayPagePending } from "~/features/today/components/day-page-pending";
import { renderWithMantine } from "~/test-utils/render";

const { useRecentConcreteActionsMock } = vi.hoisted(() => ({
  useRecentConcreteActionsMock: vi.fn(() => ({ data: [] as string[] })),
}));

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: useRecentConcreteActionsMock,
}));

test("DayPagePending は Distinction 2000 の shimmer を出す", () => {
  const { getAllByText } = renderWithMantine(<DayPagePending dateJst="2026-08-17" />);
  expect(getAllByText("Distinction 2000").length).toBeGreaterThan(0);
});

test("DayPagePending は shimmer の疑似 itemId で候補クエリを投げない", () => {
  useRecentConcreteActionsMock.mockClear();
  renderWithMantine(<DayPagePending dateJst="2026-08-17" />);
  expect(useRecentConcreteActionsMock).not.toHaveBeenCalled();
});
