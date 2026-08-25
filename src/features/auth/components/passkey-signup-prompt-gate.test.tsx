import { expect, test, vi } from "vite-plus/test";

import { PasskeySignupPromptGate } from "~/features/auth/components/passkey-signup-prompt-gate";
import {
  PASSKEY_OAUTH_PENDING_KEY,
  PASSKEY_SIGNUP_PROMPT_KEY,
  readPasskeyFlag,
  readPasskeySessionFlag,
  writePasskeyFlag,
} from "~/lib/passkey-storage";
import { renderWithMantine } from "~/test-utils/render";

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

test("signup prompt フラグが立っていればモーダルが開き、mount 後にフラグが消費される", async () => {
  mockStorage();
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);

  const { findByText } = renderWithMantine(<PasskeySignupPromptGate />);

  expect(await findByText("パスキーを登録しますか？")).toBeDefined();
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(false);
  vi.unstubAllGlobals();
});

test("フラグが無ければモーダルは開かない", () => {
  mockStorage();

  const { queryByText } = renderWithMantine(<PasskeySignupPromptGate />);

  expect(queryByText("パスキーを登録しますか？")).toBeNull();
  vi.unstubAllGlobals();
});
