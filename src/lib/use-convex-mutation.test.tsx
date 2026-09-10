import { renderHook } from "@testing-library/react";
import { ConvexProvider, ConvexReactClient, type ReactMutation } from "convex/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, expectTypeOf, test, vi } from "vite-plus/test";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

declare const nativeMutation: ReactMutation<typeof api.mutations.days.setMemo.setMemo>;
type MutationHandle = ReturnType<
  typeof useConvexMutation<typeof api.mutations.days.setMemo.setMemo>
>;
declare const mutationHandle: MutationHandle;

afterEach(() => vi.restoreAllMocks());

test("optimistic callbacks preserve the SDK synchronous type constraint", () => {
  type AsyncUpdate = () => Promise<void>;
  type SyncUpdate = () => void;
  expectTypeOf<Parameters<typeof mutationHandle.withOptimisticUpdate<AsyncUpdate>>>().toEqualTypeOf<
    Parameters<typeof nativeMutation.withOptimisticUpdate<AsyncUpdate>>
  >();
  expectTypeOf<Parameters<typeof mutationHandle.withOptimisticUpdate<SyncUpdate>>>().toExtend<
    Parameters<typeof nativeMutation.withOptimisticUpdate<SyncUpdate>>
  >();
});

test("mutation helpers preserve the server result and optimistic handler", async () => {
  const client = new ConvexReactClient("https://example.convex.cloud");
  const mutation = vi.spyOn(client, "mutation").mockResolvedValue(null);
  const optimisticUpdate = vi.fn();
  function Wrapper({ children }: PropsWithChildren) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }
  const { result, unmount } = renderHook(
    () =>
      useConvexMutation(api.mutations.days.setMemo.setMemo).withOptimisticUpdate(optimisticUpdate),
    { wrapper: Wrapper },
  );
  const args = { dateJst: "2026-09-10", todayJst: "2026-09-10", memo: "記録" };
  await expect(result.current.mutateAsync(args)).resolves.toBeNull();
  expect(mutation).toHaveBeenCalledWith(api.mutations.days.setMemo.setMemo, args, {
    optimisticUpdate,
  });
  unmount();
  await client.close();
});

test("a failed mutation is never persisted or replayed after reconnect", async () => {
  const client = new ConvexReactClient("https://example.convex.cloud");
  const error = new Error("接続失敗");
  const mutation = vi.spyOn(client, "mutation").mockRejectedValue(error);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
  function Wrapper({ children }: PropsWithChildren) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }
  const { result, unmount } = renderHook(
    () => useConvexMutation(api.mutations.days.setMemo.setMemo),
    { wrapper: Wrapper },
  );
  await expect(
    result.current({ dateJst: "2026-09-10", todayJst: "2026-09-10", memo: "記録" }),
  ).rejects.toBe(error);
  window.dispatchEvent(new Event("online"));
  expect(mutation).toHaveBeenCalledOnce();
  expect(storage).not.toHaveBeenCalled();
  unmount();
  await client.close();
});
