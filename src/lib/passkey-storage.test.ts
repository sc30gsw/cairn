import { expect, test, beforeEach } from "vite-plus/test";

import {
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_OAUTH_PENDING_KEY,
  PASSKEY_SIGNUP_PROMPT_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  consumeSignupPasskeyPromptOpen,
  readPasskeyFlag,
  readPasskeySessionFlag,
  shouldOpenMyPagePasskeyPrompt,
  writePasskeyFlag,
  writePasskeySessionFlag,
} from "~/lib/passkey-storage";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test("readPasskeyFlag / writePasskeyFlag は localStorage を使う", () => {
  expect(readPasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY)).toBe(false);
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY)).toBe(true);
});

test("shouldOpenMyPagePasskeyPrompt は skipped かつ未 reprompt のとき true", () => {
  writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
  expect(shouldOpenMyPagePasskeyPrompt()).toBe(true);
  writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, true);
  expect(shouldOpenMyPagePasskeyPrompt()).toBe(false);
});

test("consumeSignupPasskeyPromptOpen は OAuth pending を signup prompt に昇格する", () => {
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);
  expect(consumeSignupPasskeyPromptOpen()).toBe(true);
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
});
