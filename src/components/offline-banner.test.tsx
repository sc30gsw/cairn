import { expect, test, vi } from "vite-plus/test";

import { OfflineBanner } from "~/components/offline-banner";
import { renderWithMantine } from "~/test-utils/render";

const { onlineMock } = vi.hoisted(() => ({ onlineMock: vi.fn(() => true) }));

vi.mock("~/hooks/use-online-status", () => ({
  useOnlineStatus: () => onlineMock(),
}));

test("オンラインなら何も描かない", () => {
  onlineMock.mockReturnValue(true);
  const { queryByRole, queryByText } = renderWithMantine(<OfflineBanner />);

  expect(queryByText(/記録の保存はできません/)).toBeNull();
  expect(queryByRole("alert")).toBeNull();
});

test("オフラインなら「記録の保存はできません」と出す", () => {
  onlineMock.mockReturnValue(false);
  const { getByText } = renderWithMantine(<OfflineBanner />);

  expect(getByText(/記録の保存はできません/)).toBeDefined();
});
