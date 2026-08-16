import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { authClient } from "~/lib/auth-client";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: { social: vi.fn() },
    signOut: vi.fn(),
    useSession: vi.fn(),
  },
}));

vi.mock("~/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

test("未ログインならログイン画面が見える", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    error: null,
    isPending: false,
    isRefetching: false,
  });
  const { getByRole } = renderWithMantine(
    <OwnerGate>
      <p>記録</p>
    </OwnerGate>,
  );
  expect(getByRole("button", { name: "Notion でログイン" })).toBeDefined();
});

test("ログイン済みなら子が見える", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: {
      session: { id: "s" },
      user: { email: "owner@example.com", image: null, name: "Owner" },
    },
    error: null,
    isPending: false,
    isRefetching: false,
  });
  const { getByText } = renderWithMantine(
    <OwnerGate>
      <p>記録</p>
    </OwnerGate>,
  );
  expect(getByText("記録")).toBeDefined();
});
