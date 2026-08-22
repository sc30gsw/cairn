import { expect, test, vi } from "vite-plus/test";

import {
  PASSKEY_SIGNUP_PROMPT_KEY,
  readPasskeyFlag,
  writePasskeyFlag,
} from "~/lib/passkey-storage";

test("readPasskeyFlag / writePasskeyFlag は localStorage を使う", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });

  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(true);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  vi.unstubAllGlobals();
});
