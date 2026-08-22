import * as v from "valibot";

import { displayNameField, passwordField, usernameField } from "~/lib/validation/account-fields";

const ACCOUNT_AUTH_MODES = ["signIn", "signUp"] as const;

export type AccountAuthMode = (typeof ACCOUNT_AUTH_MODES)[number];

export const AccountLoginSchema = v.object({
  identifier: v.pipe(
    v.string("ユーザー名またはメールアドレスを入力してください"),
    v.nonEmpty("ユーザー名またはメールアドレスを入力してください"),
  ),
  password: passwordField,
});

export const AccountSignUpSchema = v.object({
  email: v.pipe(
    v.string("メールアドレスを入力してください"),
    v.nonEmpty("メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  name: displayNameField,
  password: passwordField,
  username: usernameField,
});

export type AccountLoginInput = v.InferOutput<typeof AccountLoginSchema>;
export type AccountSignUpInput = v.InferOutput<typeof AccountSignUpSchema>;

export function isEmailAddress(value: string): boolean {
  return v.safeParse(v.pipe(v.string(), v.email()), value).success;
}
