import type { Passkey } from "@better-auth/passkey/client";
import { screen, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi, beforeEach } from "vite-plus/test";

import { MyPagePasskeyReprompt } from "~/features/auth/components/my-page-passkey-reprompt";
import { AuthActionError } from "~/lib/errors";
import * as passkeyStorage from "~/lib/passkey-storage";
import * as profileActions from "~/lib/profile-actions";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/lib/profile-actions", () => ({
  listPasskeys: vi.fn(),
}));

vi.mock("~/lib/passkey-storage", async () => {
  const actual = await vi.importActual<typeof passkeyStorage>("~/lib/passkey-storage");
  return {
    ...actual,
    shouldOpenMyPagePasskeyPrompt: vi.fn(),
    shouldShowMyPagePasskeyPrompt: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(passkeyStorage.shouldOpenMyPagePasskeyPrompt).mockReturnValue(true);
  vi.mocked(passkeyStorage.shouldShowMyPagePasskeyPrompt).mockImplementation(
    (hasRegisteredPasskeys) => !hasRegisteredPasskeys,
  );
  vi.mocked(profileActions.listPasskeys).mockResolvedValue(Result.ok([]));
});

test("MyPagePasskeyReprompt は passkey 未登録ならモーダルを開く", async () => {
  vi.mocked(profileActions.listPasskeys).mockResolvedValue(Result.ok([]));

  renderWithMantine(<MyPagePasskeyReprompt />);

  await waitFor(() => {
    expect(screen.getByRole("dialog", { name: "パスキーを登録しますか？" })).toBeDefined();
  });
});

test("MyPagePasskeyReprompt は passkey 登録済みならモーダルを開かない", async () => {
  vi.mocked(profileActions.listPasskeys).mockResolvedValue(Result.ok([{ id: "pk_1" } as Passkey]));

  renderWithMantine(<MyPagePasskeyReprompt />);

  await waitFor(() => {
    expect(profileActions.listPasskeys).toHaveBeenCalled();
  });
  expect(screen.queryByRole("dialog", { name: "パスキーを登録しますか？" })).toBeNull();
});

test("MyPagePasskeyReprompt は listPasskeys 失敗時もモーダルを開かない", async () => {
  vi.mocked(profileActions.listPasskeys).mockResolvedValue(
    Result.err(new AuthActionError({ message: "取得に失敗しました" })),
  );

  renderWithMantine(<MyPagePasskeyReprompt />);

  await waitFor(() => {
    expect(profileActions.listPasskeys).toHaveBeenCalled();
  });
  expect(screen.queryByRole("dialog", { name: "パスキーを登録しますか？" })).toBeNull();
});

test("MyPagePasskeyReprompt は storage フラグが false なら listPasskeys を呼ばない", async () => {
  vi.mocked(passkeyStorage.shouldOpenMyPagePasskeyPrompt).mockReturnValue(false);

  renderWithMantine(<MyPagePasskeyReprompt />);

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(profileActions.listPasskeys).not.toHaveBeenCalled();
});
