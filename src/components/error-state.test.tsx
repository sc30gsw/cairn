import { ConvexError } from "convex/values";
import { expect, test, vi } from "vite-plus/test";

import { ErrorState, FullPageErrorState, RouteErrorComponent } from "~/components/error-state";
import { renderWithMantine } from "~/test-utils/render";

const RAW_SERVER_MESSAGE =
  '[CONVEX M(mutations/days/open:open)] [Request ID: 56d830745263d83a] Server Error Uncaught ConvexError: {"message":"x","tag":"Unauthenticated"} at throwDomain';

test("認証エラーでは利用者向けの文言とログイン導線を出す", () => {
  const error = new ConvexError({
    message: "ログインが必要です。所有者として入り直してください。",
    tag: "Unauthenticated",
  });

  const { getByText, getByRole } = renderWithMantine(<ErrorState error={error} />);

  expect(getByText("ログインが必要です。所有者として入り直してください。")).toBeDefined();
  expect(getByRole("button", { name: "ログインし直す" })).toBeDefined();
});

test("想定外の例外では生のサーバーメッセージを描画しない", () => {
  const { container, queryByText } = renderWithMantine(
    <ErrorState error={new Error(RAW_SERVER_MESSAGE)} />,
  );

  expect(queryByText(RAW_SERVER_MESSAGE)).toBeNull();
  expect(container.textContent).not.toContain("CONVEX");
  expect(container.textContent).not.toContain("throwDomain");
  expect(container.textContent).not.toContain("Request ID");
});

test("再試行ボタンは onRetry を呼ぶ", () => {
  const onRetry = vi.fn();
  const { getByRole } = renderWithMantine(
    <ErrorState error={new Error(RAW_SERVER_MESSAGE)} onRetry={onRetry} />,
  );

  getByRole("button", { name: "もう一度試す" }).click();

  expect(onRetry).toHaveBeenCalledOnce();
});

test("ルーターのエラー境界に渡す形でも生のサーバーメッセージは出ず、reset で再試行できる", () => {
  const reset = vi.fn();
  const { container, getByRole } = renderWithMantine(
    <RouteErrorComponent error={new Error(RAW_SERVER_MESSAGE)} reset={reset} />,
  );

  expect(container.textContent).not.toContain("CONVEX");
  getByRole("button", { name: "もう一度試す" }).click();
  expect(reset).toHaveBeenCalledOnce();
});

test("全画面表示では見出しとして読め、生のサーバーメッセージは出ない", () => {
  const { container, getByRole } = renderWithMantine(
    <FullPageErrorState error={new Error(RAW_SERVER_MESSAGE)} onRetry={vi.fn()} />,
  );

  expect(getByRole("heading", { name: "エラーが発生しました" })).toBeDefined();
  expect(container.textContent).not.toContain("CONVEX");
  expect(container.textContent).not.toContain("throwDomain");
});
