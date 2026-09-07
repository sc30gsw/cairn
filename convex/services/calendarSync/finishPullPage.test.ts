import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import type { PulledEvent } from "../../lib/validators";
import schema from "../../schema";
import { applyPull } from "./applyPull";
import { finishPullPage } from "./finishCalendarPull";

const modules = import.meta.glob([
  "../../**/*.ts",
  "!../../**/*.test.ts",
  "!../../auth.config.ts",
  "!../../auth.ts",
  "!../../betterAuth/**",
  "!../../convex.config.ts",
  "!../../crons.ts",
  "!../../http.ts",
  "!../../migrations.ts",
]);

const event = {
  allDay: false,
  calendarId: "calendar",
  googleEventId: "meeting",
  kind: "upsert",
  startAt: "2026-08-17 10:00:00",
  endAt: "2026-08-17 11:00:00",
  title: "会議",
  updated: "2026-08-17T02:00:00Z",
} as const satisfies PulledEvent;

test("古い結果で更新しなかった写しも、その取り込みで返された予定として全件整理で保持する", async () => {
  const t = convexTest(schema, modules);
  const connectionId = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      ownerId: "owner",
      googleAccountId: "google",
      primaryCalendarId: "calendar",
      calendars: [{ id: "calendar", primary: true, summary: "予定", accessRole: "owner" }],
      status: "ok",
      visibleCalendarIds: ["calendar"],
    }),
  );
  const base = {
    ownerId: "owner",
    connectionId,
    calendarId: "calendar",
    todayJst: "2026-08-17",
    finish: null,
  };
  await t.run((ctx) => applyPull(ctx, { ...base, pullId: "first", events: [event] }));
  await t.run((ctx) =>
    applyPull(ctx, {
      ...base,
      pullId: "second",
      events: [{ ...event, title: "古い件名", updated: "2026-08-17T01:00:00Z" }],
    }),
  );
  await t.run((ctx) =>
    finishPullPage(ctx, {
      ownerId: "owner",
      connectionId,
      calendarId: "calendar",
      pullId: "second",
      full: true,
      todayJst: "2026-08-17",
      syncToken: "token",
      cursor: null,
    }),
  );
  expect(await t.run((ctx) => ctx.db.query("externalCalendarEvents").unique())).toMatchObject({
    title: "会議",
    lastPullId: "second",
  });
});
