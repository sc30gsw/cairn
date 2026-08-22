import * as v from "valibot";

export const usernameField = v.pipe(
  v.string("ユーザー名を入力してください"),
  v.nonEmpty("ユーザー名を入力してください"),
  v.minLength(3, "ユーザー名は3文字以上にしてください"),
  v.maxLength(30, "ユーザー名は30文字以内にしてください"),
  v.regex(/^[\dA-Za-z_]+$/, "ユーザー名は英数字とアンダースコアだけ使えます"),
);

export const displayNameField = v.pipe(
  v.string("表示名を入力してください"),
  v.nonEmpty("表示名を入力してください"),
  v.maxLength(50, "表示名は50文字以内にしてください"),
);

export const passwordField = v.pipe(
  v.string("パスワードを入力してください"),
  v.nonEmpty("パスワードを入力してください"),
  v.minLength(8, "パスワードは8文字以上にしてください"),
);

export const currentPasswordField = v.pipe(
  v.string("現在のパスワードを入力してください"),
  v.nonEmpty("現在のパスワードを入力してください"),
);

export const newPasswordField = passwordField;
