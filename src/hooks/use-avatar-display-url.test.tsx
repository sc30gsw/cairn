import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { useAvatarDisplayUrl } from "~/hooks/use-avatar-display-url";
import { renderWithMantine } from "~/test-utils/render";

const STORAGE_IMAGE = "convex-storage:storage123";

function Probe({ image }: { image: null | string | undefined }) {
  const src = useAvatarDisplayUrl(image);
  return <span>{src ?? "none"}</span>;
}

function renderWithQueryClient(image: null | string | undefined, queryFn: () => Promise<unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { queryFn, retry: false },
    },
  });
  return {
    queryClient,
    ...renderWithMantine(
      <QueryClientProvider client={queryClient}>
        <Probe image={image} />
      </QueryClientProvider>,
    ),
  };
}

test("外部 URL はクエリを経由せずそのまま返す", async () => {
  const { findByText } = renderWithQueryClient("https://example.com/a.png", () =>
    Promise.reject(new Error("should not be called")),
  );

  expect(await findByText("https://example.com/a.png")).toBeDefined();
});

test("image が null ならクエリを skip して none を返す", async () => {
  const { findByText } = renderWithQueryClient(null, () =>
    Promise.reject(new Error("should not be called")),
  );

  expect(await findByText("none")).toBeDefined();
});

test("ストレージ参照が解決できたら URL を返す", async () => {
  const { findByText } = renderWithQueryClient(STORAGE_IMAGE, () =>
    Promise.resolve("https://cdn.example.com/avatar.png"),
  );

  expect(await findByText("https://cdn.example.com/avatar.png")).toBeDefined();
});

test("クエリが null を返したら(未 claim / 削除済み)フォールバックの undefined になる", async () => {
  const { findByText } = renderWithQueryClient(STORAGE_IMAGE, () => Promise.resolve(null));

  expect(await findByText("none")).toBeDefined();
});

test("クエリが失敗してもクラッシュせずフォールバックのままになる", async () => {
  const { findByText, getByText, queryClient } = renderWithQueryClient(STORAGE_IMAGE, () =>
    Promise.reject(new Error("network down")),
  );

  expect(await findByText("none")).toBeDefined();
  await waitFor(() => {
    expect(queryClient.isFetching()).toBe(0);
  });
  expect(getByText("none")).toBeDefined();
});
