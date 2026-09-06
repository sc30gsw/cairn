import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import schema from "../../schema";
import { applyPull } from "./applyPull";
import { finishCalendarPull } from "./finishCalendarPull";

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

test("同期窓の前日に始まり窓内で終わる予定を取り込み、全件・差分整理でも保持する", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      ownerId: "owner",
      googleAccountId: "google",
      primaryCalendarId: "calendar",
      calendars: [{ id: "calendar", primary: true, summary: "予定", accessRole: "owner" }],
      status: "ok",
      visibleCalendarIds: ["calendar"],
    }),
  );
  const base = { calendarId: "primary", ownerId: "owner", todayJst: "2026-08-17" };
  const event = {
    allDay: false,
    calendarId: base.calendarId,
    kind: "upsert",
    startAt: "2026-07-17 23:00:00",
    title: "夜勤",
    updated: "2026-07-17T00:00:00Z",
  } satisfies Omit<
    Extract<Parameters<typeof applyPull>[1]["events"][number], { kind: "upsert" }>,
    "endAt" | "googleEventId"
  >;

  await t.run(async (ctx) =>
    applyPull(ctx, {
      ...base,
      events: [
        { ...event, endAt: "2026-07-18 02:00:00", googleEventId: "overlap" },
        { ...event, endAt: "2026-07-18 00:00:00", googleEventId: "ends-at-boundary" },
      ],
      finish: { keepEventIds: ["overlap", "ends-at-boundary"], syncToken: "full" },
    }),
  );

  expect(
    await t.run(async (ctx) => ctx.db.query("externalCalendarEvents").collect()),
  ).toMatchObject([{ googleEventId: "overlap" }]);

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, { ...base, keepEventIds: null, syncToken: "incremental" }),
  );
  expect(
    await t.run(async (ctx) => ctx.db.query("externalCalendarEvents").collect()),
  ).toMatchObject([{ googleEventId: "overlap" }]);
});
