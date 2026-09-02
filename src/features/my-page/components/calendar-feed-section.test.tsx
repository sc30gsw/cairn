import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import {
  CALENDAR_FEED_ISSUE_LABEL,
  CALENDAR_FEED_ISSUED_MESSAGE,
  CALENDAR_FEED_OPEN_LABEL,
  CALENDAR_FEED_REISSUE_LABEL,
  CALENDAR_FEED_REVOKE_LABEL,
  CALENDAR_FEED_URL_LABEL,
  CalendarFeedSection,
} from "~/features/my-page/components/calendar-feed-section";
import { renderWithMantine } from "~/test-utils/render";

const TOKEN = "t".repeat(43);

const { feedState, issueMutate, revokeMutate, runMutation } = vi.hoisted(() => ({
  feedState: { token: null as string | null },
  issueMutate: vi.fn().mockResolvedValue("new-token"),
  revokeMutate: vi.fn().mockResolvedValue(null),
  runMutation: vi.fn((operation: () => Promise<unknown>, _options: unknown) => operation()),
}));

vi.mock("~/features/my-page/hooks/use-calendar-feed", () => ({
  useCalendarFeedStatus: () => ({ data: { token: feedState.token } }),
  useIssueCalendarFeed: () => ({ mutateAsync: issueMutate }),
  useRevokeCalendarFeed: () => ({ mutateAsync: revokeMutate }),
}));

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>, options: unknown) =>
    runMutation(operation, options),
}));

beforeEach(() => {
  feedState.token = null;
  issueMutate.mockClear();
  revokeMutate.mockClear();
  runMutation.mockClear();
  vi.stubEnv("VITE_CONVEX_URL", "https://happy-otter-123.convex.cloud");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("未発行なら発行ボタンだけがあり、押すと発行のミューテーションが走る", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(<CalendarFeedSection />);
  expect(queryByLabelText(CALENDAR_FEED_URL_LABEL)).toBeNull();

  getByRole("button", { name: CALENDAR_FEED_ISSUE_LABEL }).click();

  await vi.waitFor(() => {
    expect(issueMutate).toHaveBeenCalledWith({});
  });
  expect(runMutation).toHaveBeenCalledWith(expect.any(Function), {
    successMessage: CALENDAR_FEED_ISSUED_MESSAGE,
  });
});

test("発行済みなら URL・コピー・webcal リンク・作り直し・停止が出る", () => {
  feedState.token = TOKEN;
  const { getByLabelText, getByRole } = renderWithMantine(<CalendarFeedSection />);

  const input = getByLabelText(CALENDAR_FEED_URL_LABEL) as HTMLInputElement;
  expect(input.value).toBe(`https://happy-otter-123.convex.site/calendar/${TOKEN}.ics`);
  expect(getByRole("link", { name: CALENDAR_FEED_OPEN_LABEL }).getAttribute("href")).toMatch(
    /^webcal:\/\//,
  );
  expect(getByRole("button", { name: CALENDAR_FEED_REISSUE_LABEL })).toBeDefined();
  expect(getByRole("button", { name: CALENDAR_FEED_REVOKE_LABEL })).toBeDefined();
});
