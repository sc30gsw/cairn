import { expect, test, vi } from "vite-plus/test";

import {
  consumeSignupPasskeyPromptOpen,
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_OAUTH_PENDING_KEY,
  PASSKEY_SIGNUP_PROMPT_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  readPasskeyFlag,
  readPasskeySessionFlag,
  shouldOpenMyPagePasskeyPrompt,
  writePasskeyFlag,
  writePasskeySessionFlag,
} from "~/lib/passkey-storage";

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
  return { local, session };
}

test("readPasskeyFlag / writePasskeyFlag は localStorage を使う", () => {
  mockStorage();

  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(true);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  vi.unstubAllGlobals();
});

test("consumeSignupPasskeyPromptOpen は OAuth pending を signup prompt に変換する", () => {
  mockStorage();
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);

  expect(consumeSignupPasskeyPromptOpen()).toBe(true);
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  vi.unstubAllGlobals();
});

test("shouldOpenMyPagePasskeyPrompt は skip 済みで未再提示なら true", () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, false);

  expect(shouldOpenMyPagePasskeyPrompt()).toBe(true);
  vi.unstubAllGlobals();
});

test("shouldOpenMyPagePasskeyPrompt は再提示済みなら false", () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, true);

  expect(shouldOpenMyPagePasskeyPrompt()).toBe(false);
  vi.unstubAllGlobals();
});
