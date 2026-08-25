import * as v from "valibot";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "~domain/authFields";

export const usernameField = v.pipe(
  v.string("ユーザー名を入力してください"),
  v.nonEmpty("ユーザー名を入力してください"),
  v.minLength(USERNAME_MIN_LENGTH, `ユーザー名は${USERNAME_MIN_LENGTH}文字以上にしてください`),
  v.maxLength(USERNAME_MAX_LENGTH, `ユーザー名は${USERNAME_MAX_LENGTH}文字以内にしてください`),
  v.regex(USERNAME_PATTERN, "ユーザー名は英数字とアンダースコアだけ使えます"),
);

export const displayNameField = v.pipe(
  v.string("表示名を入力してください"),
  v.nonEmpty("表示名を入力してください"),
  v.maxLength(50, "表示名は50文字以内にしてください"),
);

export const passwordField = v.pipe(
  v.string("パスワードを入力してください"),
  v.nonEmpty("パスワードを入力してください"),
  v.minLength(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`),
);

export const currentPasswordField = v.pipe(
  v.string("現在のパスワードを入力してください"),
  v.nonEmpty("現在のパスワードを入力してください"),
);

export const newPasswordField = passwordField;
