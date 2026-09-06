import { Result } from "better-result";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { signInWithGoogle, signOutAndReload } from "~/features/auth/lib/auth-actions";
import { authClient } from "~/lib/auth-client";
import { PASSKEY_OAUTH_PENDING_KEY, readPasskeySessionFlag } from "~/lib/passkey-storage";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: { social: vi.fn() },
    signOut: vi.fn(),
  },
}));

function mockStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => local.get(key) ?? null,
    removeItem: (key: string) => {
      local.delete(key);
    },
    setItem: (key: string, value: string) => {
      local.set(key, value);
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => session.get(key) ?? null,
    removeItem: (key: string) => {
      session.delete(key);
    },
    setItem: (key: string, value: string) => {
      session.set(key, value);
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("signInWithGoogle は成功時に Result.ok を返す", async () => {
  vi.mocked(authClient.signIn.social).mockResolvedValue({ data: {}, error: undefined });

  const result = await signInWithGoogle();

  expect(Result.isOk(result)).toBe(true);
});

test("signInWithGoogle は失敗時に Result.err を返し、pending フラグを消す", async () => {
  vi.mocked(authClient.signIn.social).mockResolvedValue({
    data: undefined,
    error: { message: "failed" },
  });

  const result = await signInWithGoogle();

  expect(Result.isError(result)).toBe(true);
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(false);
});

test("signInWithGoogle は redirect 前に pending フラグを立てる", async () => {
  vi.mocked(authClient.signIn.social).mockImplementation(async () => {
    expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(true);
    return { data: {}, error: undefined };
  });

  await signInWithGoogle();

  expect(authClient.signIn.social).toHaveBeenCalledWith({
    callbackURL: `${location.origin}/`,
    errorCallbackURL: `${location.origin}/?authError=google`,
    provider: "google",
  });
});

test("signOutAndReload は成功時に Result.ok を返しリロードする", async () => {
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
  vi.mocked(authClient.signOut).mockResolvedValue({ data: {}, error: undefined });

  const result = await signOutAndReload();

  expect(Result.isOk(result)).toBe(true);
  expect(reload).toHaveBeenCalledTimes(1);
  reload.mockRestore();
});

test("signOutAndReload は失敗時に Result.err を返し、リロードしない", async () => {
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
  vi.mocked(authClient.signOut).mockResolvedValue({
    data: undefined,
    error: { message: "failed" },
  });

  const result = await signOutAndReload();

  expect(Result.isError(result)).toBe(true);
  expect(reload).not.toHaveBeenCalled();
  reload.mockRestore();
});
