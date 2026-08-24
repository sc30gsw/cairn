import { expect, test } from "vite-plus/test";

import { notificationLink } from "~/lib/notification-link";

test("通知の種類ごとのリンク先", () => {
  expect(notificationLink("checkpointDeadline")).toBe("/goals");
  expect(notificationLink("weeklyTargetMiss")).toBe("/review");
  expect(notificationLink("eveningUntouched")).toBe("/");
});
