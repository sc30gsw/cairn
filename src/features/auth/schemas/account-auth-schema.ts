import * as v from "valibot";

export const ACCOUNT_AUTH_MODES = ["signIn", "signUp"] as const;

export type AccountAuthMode = (typeof ACCOUNT_AUTH_MODES)[number];

const usernamePattern = /^[\dA-Za-z_]+$/;

export const AccountLoginSchema = v.object({
  identifier: v.pipe(
    v.string("ユーザー名またはメールアドレスを入力してください"),
    v.nonEmpty("ユーザー名またはメールアドレスを入力してください"),
  ),
  password: v.pipe(
    v.string("パスワードを入力してください"),
    v.nonEmpty("パスワードを入力してください"),
    v.minLength(8, "パスワードは8文字以上にしてください"),
  ),
});

export const AccountSignUpSchema = v.object({
  email: v.pipe(
    v.string("メールアドレスを入力してください"),
    v.nonEmpty("メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  name: v.pipe(
    v.string("表示名を入力してください"),
    v.nonEmpty("表示名を入力してください"),
    v.maxLength(50, "表示名は50文字以内にしてください"),
  ),
  password: v.pipe(
    v.string("パスワードを入力してください"),
    v.nonEmpty("パスワードを入力してください"),
    v.minLength(8, "パスワードは8文字以上にしてください"),
  ),
  username: v.pipe(
    v.string("ユーザー名を入力してください"),
    v.nonEmpty("ユーザー名を入力してください"),
    v.minLength(3, "ユーザー名は3文字以上にしてください"),
    v.maxLength(30, "ユーザー名は30文字以内にしてください"),
    v.regex(usernamePattern, "ユーザー名は英数字とアンダースコアだけ使えます"),
  ),
});

export type AccountLoginInput = v.InferOutput<typeof AccountLoginSchema>;
export type AccountSignUpInput = v.InferOutput<typeof AccountSignUpSchema>;

export function isEmailAddress(value: string): boolean {
  return v.safeParse(v.pipe(v.string(), v.email()), value).success;
}
