import { Result } from "better-result";
import { expect, test } from "vite-plus/test";

import { authActionErrorMessage, runAuthAction } from "~/lib/auth-action-result";
import { AuthActionError } from "~/lib/errors";

test("authActionErrorMessage は成功 Result で null を返す", () => {
  expect(authActionErrorMessage(Result.ok(undefined))).toBeNull();
});

test("authActionErrorMessage は失敗 Result で message を返す", () => {
  expect(
    authActionErrorMessage(Result.err(new AuthActionError({ message: "ログインに失敗しました" }))),
  ).toBe("ログインに失敗しました");
});

test("runAuthAction は action 成功時に onSuccess を呼ぶ", async () => {
  let called = false;
  const result = await runAuthAction(
    async () => {},
    "signIn",
    () => {
      called = true;
    },
  );

  expect(called).toBe(true);
  expect(Result.isOk(result)).toBe(true);
});

test("runAuthAction は onSuccess が throw しても reject せず Result.err に変換する", async () => {
  const result = await runAuthAction(
    async () => {},
    "signIn",
    () => {
      throw new Error("onSuccess boom");
    },
  );

  expect(Result.isError(result)).toBe(true);
});

test("runAuthAction は action が失敗したら onSuccess を呼ばない", async () => {
  let called = false;
  const result = await runAuthAction(
    async () => {
      throw new AuthActionError({ message: "失敗しました" });
    },
    "signIn",
    () => {
      called = true;
    },
  );

  expect(called).toBe(false);
  expect(Result.isError(result)).toBe(true);
});
