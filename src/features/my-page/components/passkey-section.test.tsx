import { waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi, beforeEach } from "vite-plus/test";

import { PasskeySection } from "~/features/my-page/components/passkey-section";
import * as profileActions from "~/lib/profile-actions";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/lib/profile-actions", () => ({
  addPasskey: vi.fn(),
  deletePasskey: vi.fn(),
  listPasskeys: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(profileActions.listPasskeys).mockResolvedValue(Result.ok([]));
});

test("PasskeySection はマウント時に listPasskeys を1回だけ呼ぶ", async () => {
  renderWithMantine(<PasskeySection />);

  await waitFor(() => {
    expect(profileActions.listPasskeys).toHaveBeenCalledTimes(1);
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(profileActions.listPasskeys).toHaveBeenCalledTimes(1);
});
