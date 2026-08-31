import { expect, test, beforeEach, vi } from "vite-plus/test";

import {
  consumeSignupPasskeyPromptFlags,
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_OAUTH_PENDING_KEY,
  PASSKEY_SIGNUP_PROMPT_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  readPasskeyFlag,
  readPasskeySessionFlag,
  shouldOpenMyPagePasskeyPrompt,
  shouldOpenSignupPasskeyPrompt,
  shouldShowMyPagePasskeyPrompt,
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

beforeEach(() => {
  vi.unstubAllGlobals();
});

test("readPasskeyFlag / writePasskeyFlag は localStorage を使う", () => {
  mockStorage();

  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(true);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  vi.unstubAllGlobals();
});

test("shouldOpenMyPagePasskeyPrompt は skipped かつ未 reprompt のとき true", () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  expect(shouldOpenMyPagePasskeyPrompt()).toBe(true);
  writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, true);
  expect(shouldOpenMyPagePasskeyPrompt()).toBe(false);
  vi.unstubAllGlobals();
});

test("shouldOpenSignupPasskeyPrompt は OAuth pending 中なら true(書き込みなし)", () => {
  mockStorage();
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);
  expect(shouldOpenSignupPasskeyPrompt()).toBe(true);
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(true);
  vi.unstubAllGlobals();
});

test("shouldOpenSignupPasskeyPrompt は signup prompt フラグ単体でも true", () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  expect(shouldOpenSignupPasskeyPrompt()).toBe(true);
  vi.unstubAllGlobals();
});

test("shouldOpenSignupPasskeyPrompt はどちらも立っていなければ false", () => {
  mockStorage();
  expect(shouldOpenSignupPasskeyPrompt()).toBe(false);
  vi.unstubAllGlobals();
});

test("consumeSignupPasskeyPromptFlags は OAuth pending と signup prompt を両方クリアする", () => {
  mockStorage();
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  consumeSignupPasskeyPromptFlags();
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

test("shouldShowMyPagePasskeyPrompt は登録済み passkey があると false", () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, false);

  expect(shouldShowMyPagePasskeyPrompt(true)).toBe(false);
  expect(shouldShowMyPagePasskeyPrompt(false)).toBe(true);
  vi.unstubAllGlobals();
});
