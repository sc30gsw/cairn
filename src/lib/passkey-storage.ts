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

/**
 * Peeks whether the one-shot signup prompt should open. Pure read, no storage writes —
 * safe to call from a useState initializer, which React may invoke more than once
 * (StrictMode, a discarded render) without committing.
 */
export function shouldOpenSignupPasskeyPrompt(): boolean {
  return (
    readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY) || readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)
  );
}

/**
 * Clears the one-shot signup prompt flags. Call after shouldOpenSignupPasskeyPrompt()
 * has been read into committed state (e.g. a mount effect), not from the initializer itself.
 */
export function consumeSignupPasskeyPromptFlags(): void {
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, false);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
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
