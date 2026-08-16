import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { useOpenAndLoadDay } from "~/features/today/hooks/use-open-and-load-day";
import { renderWithMantine } from "~/test-utils/render";

const dateJst = "2026-08-17";

const { open } = vi.hoisted(() => ({
  open: vi.fn(() => Promise.resolve({ applied: true })),
}));

vi.mock("~/lib/use-convex-mutation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/lib/use-convex-mutation")>();
  return {
    ...actual,
    useConvexMutation: (() =>
      Object.assign(open, { mutateAsync: open })) as unknown as typeof actual.useConvexMutation,
  };
});

function Probe() {
  const { data } = useOpenAndLoadDay(dateJst);
  return <span>{data.dateJst}</span>;
}

test("日を開くミューテーションはサスペンドを挟んでも 1 回しか走らない", async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: () => Promise.resolve({ dateJst, isFuture: false, rows: [] }),
        retry: false,
      },
    },
  });

  const { findByText } = renderWithMantine(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );

  expect(await findByText(dateJst)).toBeDefined();
  await waitFor(() => {
    expect(open).toHaveBeenCalledTimes(1);
  });
});
