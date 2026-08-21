import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { authClient } from "~/lib/auth-client";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn(), social: vi.fn(), username: vi.fn() },
    signOut: vi.fn(),
    signUp: { email: vi.fn() },
    useSession: vi.fn(),
  },
}));

vi.mock("~/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("~/features/auth/hooks/use-auth-config", () => ({
  useAuthPublicConfig: () => ({ data: { notionSignIn: false } }),
}));

const refetch = vi.fn();
const now = new Date();

test("未ログインならログイン画面が見える", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    error: null,
    isPending: false,
    isRefetching: false,
    refetch,
  });
  const { getByRole } = renderWithMantine(
    <OwnerGate>
      <p>記録</p>
    </OwnerGate>,
  );
  expect(getByRole("button", { name: "ログイン" })).toBeDefined();
});

test("ログイン済みなら子が見える", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: {
      session: {
        id: "s",
        createdAt: now,
        updatedAt: now,
        userId: "u",
        expiresAt: now,
        token: "t",
      },
      user: {
        id: "u",
        createdAt: now,
        updatedAt: now,
        email: "owner@example.com",
        emailVerified: true,
        image: null,
        name: "Owner",
      },
    },
    error: null,
    isPending: false,
    isRefetching: false,
    refetch,
  });
  const { getByText } = renderWithMantine(
    <OwnerGate>
      <p>記録</p>
    </OwnerGate>,
  );
  expect(getByText("記録")).toBeDefined();
});
