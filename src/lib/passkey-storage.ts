import {
  tryLocalStorageGet,
  tryLocalStorageRemove,
  tryLocalStorageSet,
  trySessionStorageGet,
  trySessionStorageRemove,
  trySessionStorageSet,
} from "~/lib/safe-storage";

export const PASSKEY_SIGNUP_SKIPPED_KEY = "cairn:passkey:signup-skipped";
export const PASSKEY_SIGNUP_PROMPT_KEY = "cairn:passkey:show-after-signup";
export const PASSKEY_MYPAGE_REPROMPTED_KEY = "cairn:passkey:mypage-reprompted";
export const PASSKEY_OAUTH_PENDING_KEY = "cairn:passkey:oauth-pending";

export function readPasskeyFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return tryLocalStorageGet(key) === "1";
}

export function writePasskeyFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    tryLocalStorageSet(key, "1");
  } else {
    tryLocalStorageRemove(key);
  }
}

export function readPasskeySessionFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return trySessionStorageGet(key) === "1";
}

export function writePasskeySessionFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    trySessionStorageSet(key, "1");
  } else {
    trySessionStorageRemove(key);
  }
}

/** Consumes one-shot signup prompt flags during initial render (avoids setState in effect). */
export function consumeSignupPasskeyPromptOpen(): boolean {
  if (readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)) {
    writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, false);
    writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  }

  if (readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)) {
    writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
    return true;
  }

  return false;
}

export function shouldOpenMyPagePasskeyPrompt(): boolean {
  const skippedSignup = readPasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY);
  const reprompted = readPasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY);
  return skippedSignup && !reprompted;
}

/** Storage flags plus whether the user already has at least one passkey. */
export function shouldShowMyPagePasskeyPrompt(hasRegisteredPasskeys: boolean): boolean {
  if (hasRegisteredPasskeys) {
    return false;
  }
  return shouldOpenMyPagePasskeyPrompt();
}
