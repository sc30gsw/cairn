import { ConvexError } from "convex/values";
import { expect, test } from "vite-plus/test";

import { presentError, UNEXPECTED_ERROR_PRESENTATION } from "~/lib/error-presentation";

const RAW_SERVER_MESSAGE =
  '[CONVEX M(mutations/days/open:open)] [Request ID: 56d830745263d83a] Server Error Uncaught ConvexError: {"message":"x","tag":"Unauthenticated"} at throwDomain (../../convex/lib/ownerFunctions.ts:10:0)';

test("ドメインエラーはタグごとの見出しとサーバの利用者向け文言を返す", () => {
  const error = new ConvexError({
    message: "ログインが必要です。所有者として入り直してください。",
    tag: "Unauthenticated",
  });

  expect(presentError(error)).toEqual({
    message: "ログインが必要です。所有者として入り直してください。",
    recovery: "signIn",
    title: "ログインが必要です",
  });
});

test("ConvexError インスタンスでなくても data の形が合えばドメインエラーとして扱う", () => {
  const error = { data: { message: "すでに確定済みです。", tag: "Conflict" } };

  expect(presentError(error)).toEqual({
    message: "すでに確定済みです。",
    recovery: "reload",
    title: "ほかの操作と競合しました",
  });
});

test("想定外の例外では生のメッセージを返さない", () => {
  const presentation = presentError(new Error(RAW_SERVER_MESSAGE));

  expect(presentation).toEqual(UNEXPECTED_ERROR_PRESENTATION);
  expect(presentation.message).not.toContain("Convex");
  expect(presentation.message).not.toContain("throwDomain");
});

test("想定外の例外では呼び出し側の代替文言を使う", () => {
  expect(presentError(new Error(RAW_SERVER_MESSAGE), "記録を保存できませんでした").message).toBe(
    "記録を保存できませんでした",
  );
});

test("未知のタグは想定外の例外として扱う", () => {
  const error = new ConvexError({ message: "内部の詳細", tag: "InternalDatabaseFailure" });

  expect(presentError(error)).toEqual(UNEXPECTED_ERROR_PRESENTATION);
});

test("null や文字列を渡しても既定の文言に落ちる", () => {
  expect(presentError(null)).toEqual(UNEXPECTED_ERROR_PRESENTATION);
  expect(presentError(RAW_SERVER_MESSAGE)).toEqual(UNEXPECTED_ERROR_PRESENTATION);
});
