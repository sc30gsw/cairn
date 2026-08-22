import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import {
  ProfileNameSchema,
  ProfilePasswordSchema,
  ProfileUsernameSchema,
} from "~/features/my-page/schemas/profile-schema";

function firstIssue(result: v.SafeParseResult<v.GenericSchema>) {
  return result.issues?.[0]?.message;
}

test("表示名は空を拒否する", () => {
  const result = v.safeParse(ProfileNameSchema, { name: "" });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe("表示名を入力してください");
});

test("ユーザー名は英数字とアンダースコアだけ", () => {
  const result = v.safeParse(ProfileUsernameSchema, { username: "bad-name" });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe("ユーザー名は英数字とアンダースコアだけ使えます");
});

test("新しいパスワードは8文字以上", () => {
  const result = v.safeParse(ProfilePasswordSchema, {
    currentPassword: "old-password",
    newPassword: "short",
  });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe("パスワードは8文字以上にしてください");
});
