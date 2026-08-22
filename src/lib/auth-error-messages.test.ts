import { expect, test } from "vite-plus/test";

import { presentAuthError } from "~/lib/auth-error-messages";

test("INVALID_EMAIL_OR_PASSWORD はログイン向けの actionable な日本語になる", () => {
  expect(
    presentAuthError(
      { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
      "signIn",
    ),
  ).toBe("メールアドレスまたはパスワードが正しくありません。入力内容を確認してください。");
});

test("INVALID_USERNAME_OR_PASSWORD はログイン向けの actionable な日本語になる", () => {
  expect(
    presentAuthError(
      { code: "INVALID_USERNAME_OR_PASSWORD", message: "Invalid username or password" },
      "signIn",
    ),
  ).toBe("ユーザー名またはパスワードが正しくありません。入力内容を確認してください。");
});

test("INVALID_PASSWORD はパスワード変更時に現在のパスワード向けの日本語になる", () => {
  expect(
    presentAuthError({ code: "INVALID_PASSWORD", message: "Invalid password" }, "changePassword"),
  ).toBe("現在のパスワードが正しくありません。もう一度入力してください。");
});

test("Wrong password メッセージもパスワード変更向けにマップする", () => {
  expect(presentAuthError({ message: "Wrong password" }, "changePassword")).toBe(
    "現在のパスワードが正しくありません。もう一度入力してください。",
  );
});

test("USER_ALREADY_EXISTS は登録向けの日本語になる", () => {
  expect(presentAuthError({ message: "User already exists." }, "signUp")).toBe(
    "このメールアドレスはすでに登録されています。ログインするか、別のメールアドレスを使ってください。",
  );
});

test("Email already registered メッセージも登録向けにマップする", () => {
  expect(presentAuthError({ message: "Email already registered" }, "signUp")).toBe(
    "このメールアドレスはすでに登録されています。ログインするか、別のメールアドレスを使ってください。",
  );
});

test("USERNAME_IS_ALREADY_TAKEN はユーザー名更新向けの日本語になる", () => {
  expect(
    presentAuthError(
      {
        code: "USERNAME_IS_ALREADY_TAKEN",
        message: "Username is already taken. Please try another.",
      },
      "updateUsername",
    ),
  ).toBe("このユーザー名はすでに使われています。別の名前を選んでください。");
});

test("Invalid name は表示名更新向けの日本語になる", () => {
  expect(presentAuthError({ message: "Invalid name" }, "updateName")).toBe(
    "表示名を確認してください。50文字以内で入力してください。",
  );
});

test("PASSKEY_NOT_FOUND はパスキー削除向けの日本語になる", () => {
  expect(
    presentAuthError({ code: "PASSKEY_NOT_FOUND", message: "Passkey not found" }, "deletePasskey"),
  ).toBe("パスキーが見つかりません。一覧を更新して、もう一度お試しください。");
});

test("すでに日本語のメッセージはそのまま返す", () => {
  const message = "JPEG または PNG の画像を選んでください";
  expect(presentAuthError({ message }, "updateImage")).toBe(message);
});

test("未知の英語メッセージは context 別 fallback を返す", () => {
  expect(presentAuthError({ message: "Something went wrong internally" }, "signIn")).toBe(
    "ログインに失敗しました。ユーザー名・メールアドレスとパスワードを確認してください。",
  );
});

test("PASSWORD_TOO_SHORT は文字数要件を含む日本語になる", () => {
  expect(
    presentAuthError({ code: "PASSWORD_TOO_SHORT", message: "Password too short" }, "signUp"),
  ).toBe("パスワードは8文字以上にしてください。");
});
