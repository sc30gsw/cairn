import { expect, test } from "vite-plus/test";

import { calendarFeedUrl, convexSiteUrl, webcalUrl } from "~/lib/convex-site-url";

const TOKEN = "a".repeat(43);

test("convex.cloud を convex.site に読み替え、それ以外はそのまま", () => {
  expect(convexSiteUrl("https://happy-otter-123.convex.cloud")).toBe(
    "https://happy-otter-123.convex.site",
  );
  expect(convexSiteUrl("https://happy-otter-123.convex.cloud/")).toBe(
    "https://happy-otter-123.convex.site",
  );
  expect(convexSiteUrl("https://self-hosted.example")).toBe("https://self-hosted.example");
});

test("購読 URL と webcal の形", () => {
  const url = calendarFeedUrl("https://happy-otter-123.convex.cloud", TOKEN);
  expect(url).toBe(`https://happy-otter-123.convex.site/calendar/${TOKEN}.ics`);
  expect(webcalUrl(url)).toBe(`webcal://happy-otter-123.convex.site/calendar/${TOKEN}.ics`);
});
