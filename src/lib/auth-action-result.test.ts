import { Result } from "better-result";
import { expect, test } from "vite-plus/test";

import { authActionErrorMessage } from "~/lib/auth-action-result";
import { AuthActionError } from "~/lib/errors";

test("authActionErrorMessage は成功 Result で null を返す", () => {
  expect(authActionErrorMessage(Result.ok(undefined))).toBeNull();
});

test("authActionErrorMessage は失敗 Result で message を返す", () => {
  expect(
    authActionErrorMessage(Result.err(new AuthActionError({ message: "ログインに失敗しました" }))),
  ).toBe("ログインに失敗しました");
});
