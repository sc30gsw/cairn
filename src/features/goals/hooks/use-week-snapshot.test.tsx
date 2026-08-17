import { waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { useWeekSnapshot } from "~/features/goals/hooks/use-week-snapshot";
import { renderWithMantine } from "~/test-utils/render";

const { ensureWeekSnapshot } = vi.hoisted(() => ({
  ensureWeekSnapshot: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("~/lib/use-convex-mutation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/lib/use-convex-mutation")>();
  return {
    ...actual,
    useConvexMutation: (() =>
      Object.assign(ensureWeekSnapshot, {
        mutateAsync: ensureWeekSnapshot,
      })) as unknown as typeof actual.useConvexMutation,
  };
});

function Probe({ weekStartJst }: Record<"weekStartJst", "2026-08-10" | "2026-08-17">) {
  useWeekSnapshot(weekStartJst);
  return <span>ready</span>;
}

test("同じ週では1回しかスナップショットを用意しない", async () => {
  ensureWeekSnapshot.mockClear();
  const { findByText, rerender } = renderWithMantine(<Probe weekStartJst="2026-08-17" />);

  expect(await findByText("ready")).toBeDefined();
  await waitFor(() => {
    expect(ensureWeekSnapshot).toHaveBeenCalledTimes(1);
  });
  expect(ensureWeekSnapshot).toHaveBeenCalledWith({ weekStartJst: "2026-08-17" });

  rerender(<Probe weekStartJst="2026-08-17" />);
  await waitFor(() => {
    expect(ensureWeekSnapshot).toHaveBeenCalledTimes(1);
  });
});

test("週が変わると改めてスナップショットを用意する", async () => {
  ensureWeekSnapshot.mockClear();
  const { rerender } = renderWithMantine(<Probe weekStartJst="2026-08-10" />);
  await waitFor(() => {
    expect(ensureWeekSnapshot).toHaveBeenCalledTimes(1);
  });

  rerender(<Probe weekStartJst="2026-08-17" />);
  await waitFor(() => {
    expect(ensureWeekSnapshot).toHaveBeenCalledTimes(2);
  });
  expect(ensureWeekSnapshot).toHaveBeenLastCalledWith({ weekStartJst: "2026-08-17" });
});
