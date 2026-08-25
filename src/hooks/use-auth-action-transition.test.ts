import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { afterEach, expect, test } from "vite-plus/test";

import { useAuthActionTransition } from "~/hooks/use-auth-action-transition";
import { AuthActionError } from "~/lib/errors";

afterEach(() => {
  cleanup();
});

test("成功した action の結果が run() の戻り値と state の両方に反映される", async () => {
  const { result } = renderHook(() => useAuthActionTransition());

  await act(async () => {
    await result.current.run(() => Promise.resolve(Result.ok(undefined)));
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  expect(result.current.errorMessage).toBeNull();
});

test("失敗した action の結果が errorMessage に反映される", async () => {
  const { result } = renderHook(() => useAuthActionTransition());

  await act(async () => {
    await result.current.run(() =>
      Promise.resolve(Result.err(new AuthActionError({ message: "ログインに失敗しました" }))),
    );
  });

  await waitFor(() => {
    expect(result.current.errorMessage).toBe("ログインに失敗しました");
  });
});

test("action が Promise.reject しても run() の Promise は必ず settle する(ハングしない)", async () => {
  const { result } = renderHook(() => useAuthActionTransition());

  await expect(
    act(async () => {
      await result.current.run(() => Promise.reject(new Error("boom")));
    }),
  ).rejects.toThrow("boom");
});
