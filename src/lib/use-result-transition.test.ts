import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { afterEach, expect, test } from "vite-plus/test";

import { useResultTransition } from "~/lib/use-result-transition";

afterEach(() => {
  cleanup();
});

test("成功した action の結果が run() の戻り値と state の両方に反映される", async () => {
  const { result } = renderHook(() => useResultTransition<string, Error>());

  let resolved: Result<string, Error> | undefined;
  await act(async () => {
    resolved = await result.current.run(() => Promise.resolve(Result.ok("ok")));
  });

  expect(resolved && Result.isOk(resolved) && resolved.value).toBe("ok");
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});

test("action が Promise.reject しても run() の Promise は必ず settle する(ハングしない)", async () => {
  const { result } = renderHook(() => useResultTransition<string, Error>());

  await expect(
    act(async () => {
      await result.current.run(() => Promise.reject(new Error("boom")));
    }),
  ).rejects.toThrow("boom");
});

test("action が同期的に throw しても run() の Promise は必ず settle する(ハングしない)", async () => {
  const { result } = renderHook(() => useResultTransition<string, Error>());

  await expect(
    act(async () => {
      await result.current.run(() => {
        throw new Error("sync boom");
      });
    }),
  ).rejects.toThrow("sync boom");
});
