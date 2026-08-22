import * as v from "valibot";

const usernamePattern = /^[\dA-Za-z_]+$/;

export const ProfileNameSchema = v.object({
  name: v.pipe(
    v.string("表示名を入力してください"),
    v.nonEmpty("表示名を入力してください"),
    v.maxLength(50, "表示名は50文字以内にしてください"),
  ),
});

export const ProfileUsernameSchema = v.object({
  username: v.pipe(
    v.string("ユーザー名を入力してください"),
    v.nonEmpty("ユーザー名を入力してください"),
    v.minLength(3, "ユーザー名は3文字以上にしてください"),
    v.maxLength(30, "ユーザー名は30文字以内にしてください"),
    v.regex(usernamePattern, "ユーザー名は英数字とアンダースコアだけ使えます"),
  ),
});

export const ProfilePasswordSchema = v.object({
  currentPassword: v.pipe(
    v.string("現在のパスワードを入力してください"),
    v.nonEmpty("現在のパスワードを入力してください"),
  ),
  newPassword: v.pipe(
    v.string("新しいパスワードを入力してください"),
    v.nonEmpty("新しいパスワードを入力してください"),
    v.minLength(8, "パスワードは8文字以上にしてください"),
  ),
});

export type ProfileNameInput = v.InferOutput<typeof ProfileNameSchema>;
export type ProfileUsernameInput = v.InferOutput<typeof ProfileUsernameSchema>;
export type ProfilePasswordInput = v.InferOutput<typeof ProfilePasswordSchema>;
