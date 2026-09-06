import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { TableNames } from "./_generated/dataModel";
import { GOOGLE_CALENDAR_SCOPES } from "./lib/calendarSync";
import { deleteEvent, listCalendars, listEvents } from "./lib/googleCalendar";
import schema from "./schema";
import { connect as connectCalendar } from "./services/calendarSync/connect";

const account = vi.hoisted(() => ({ id: "google-owner" }));

vi.mock("./lib/googleAccessToken", () => ({
  getGoogleAccessToken: async () => Result.ok("test-token"),
  listGoogleAccounts: async () => [{ accountId: account.id, scopes: [...GOOGLE_CALENDAR_SCOPES] }],
}));

vi.mock("./lib/googleCalendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/googleCalendar")>()),
  deleteEvent: vi.fn(),
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
}));

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
  "!./migrations.ts",
]);

const OWNER = "cleanup-owner";
const OTHER_OWNER = "another-owner";
const CALENDAR = "owner@example.com";
const SYNC_TABLES = [
  "calendarSyncLinks",
  "externalCalendarEvents",
  "calendarSyncCursors",
  "calendarExternalChanges",
] as const satisfies readonly TableNames[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-17T03:00:00Z"));
  vi.resetAllMocks();
  account.id = "google-owner";
  vi.mocked(deleteEvent).mockResolvedValue(Result.ok(undefined));
  vi.mocked(listEvents).mockResolvedValue(Result.ok({ items: [], nextSyncToken: "fresh" }));
  vi.mocked(listCalendars).mockResolvedValue(
    Result.ok([{ accessRole: "owner", id: CALENDAR, primary: true, summary: "予定" }]),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("unexpected network request");
    }),
  );
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("calendarConnections", {
      calendars: [{ accessRole: "owner", id: CALENDAR, primary: true, summary: "予定" }],
      googleAccountId: "google-owner",
      ownerId: OWNER,
      primaryCalendarId: CALENDAR,
      status: "ok",
      visibleCalendarIds: [CALENDAR],
    });
    for (const ownerId of [OWNER, OTHER_OWNER]) {
      const count = ownerId === OWNER ? 205 : 1;
      for (let index = 0; index < count; index += 1) {
        const googleEventId = `${ownerId}-${String(index)}`;
        await ctx.db.insert("calendarSyncLinks", {
          ownerId,
          calendarId: CALENDAR,
          googleEventId,
          sourceKind: "goal",
          sourceId: googleEventId,
        });
        await ctx.db.insert("externalCalendarEvents", {
          ownerId,
          calendarId: CALENDAR,
          googleEventId,
          allDay: false,
          title: "予定",
          googleUpdated: "2026-08-17T00:00:00Z",
          startAt: "2026-08-17 12:00:00",
          endAt: "2026-08-17 13:00:00",
        });
        await ctx.db.insert("calendarSyncCursors", {
          ownerId,
          calendarId: googleEventId,
          fullSyncedOnJst: "2026-08-17",
          syncToken: "old",
        });
        await ctx.db.insert("calendarExternalChanges", {
          ownerId,
          calendarId: CALENDAR,
          googleEventId,
          change: { kind: "delete" },
          settledAt: index % 2 === 0 ? Date.now() : undefined,
        });
      }
    }
  });
  return { t, owner: t.withIdentity({ subject: OWNER }) };
}

test("清掃を上限付きで確定し、残りがある間は再認証と旧ジョブを拒否する", async () => {
  const { t, owner } = await setup();
  expect(
    await t.mutation(internal.mutations.calendarSync.clearConnection.clearConnection, {
      ownerId: OWNER,
    }),
  ).toBe(false);
  await t.run(async (ctx) => {
    expect(await ctx.db.query("calendarConnections").unique()).toMatchObject({
      disconnecting: true,
      status: "error",
      googleAccountId: "google-owner",
    });
    for (const table of SYNC_TABLES) {
      const records = await ctx.db.query(table).collect();
      expect(records.filter((record) => record.ownerId === OWNER)).toHaveLength(105);
      expect(records.filter((record) => record.ownerId === OTHER_OWNER)).toHaveLength(1);
    }
  });
  for (const googleAccountId of ["google-owner"]) {
    await expect(
      t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
        ownerId: OWNER,
        googleAccountId,
        googleEmail: CALENDAR,
        calendars: [],
        defaultVisibleCalendarIds: [],
      }),
    ).rejects.toThrow();
  }
  await t.mutation(
    internal.mutations.calendarSync.adoptLegacyExternalChange.adoptLegacyExternalChange,
    {
      ownerId: OWNER,
      calendarId: CALENDAR,
      googleEventId: "late-legacy",
      change: { kind: "delete" },
    },
  );
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("error");
  expect(listEvents).not.toHaveBeenCalled();
  expect(deleteEvent).not.toHaveBeenCalled();
  await t.run(async (ctx) => {
    expect(
      await ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_calendar_and_event", (q) =>
          q.eq("ownerId", OWNER).eq("calendarId", CALENDAR).eq("googleEventId", "late-legacy"),
        )
        .unique(),
    ).toBeNull();
  });
});

test.each(["disconnect", "reconnect"] as const satisfies readonly string[])(
  "清掃途中で停止しても lease 失効後の %s が残りを完了する",
  async (operation) => {
    const { t, owner } = await setup();
    await t.run(async (ctx) =>
      ctx.db.insert("calendarSyncOperations", {
        ownerId: OWNER,
        expiresAt: Date.now() + 11 * 60 * 1000,
      }),
    );
    expect(
      await t.mutation(internal.mutations.calendarSync.clearConnection.clearConnection, {
        ownerId: OWNER,
      }),
    ).toBe(false);
    expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("busy");
    vi.advanceTimersByTime(12 * 60 * 1000);
    if (operation === "disconnect") {
      await owner.action(api.actions.calendarSync.disconnect.disconnect, {});
    } else {
      await owner.action(api.actions.calendarSync.disconnect.disconnect, {});
      expect(await owner.action((ctx) => connectCalendar(ctx, OWNER, account.id))).toBe("ok");
    }
    await t.run(async (ctx) => {
      for (const table of SYNC_TABLES) {
        const records = await ctx.db.query(table).collect();
        const owned = records.filter((record) => record.ownerId === OWNER);
        expect(owned).toHaveLength(
          table === "calendarSyncCursors" && operation !== "disconnect" ? 1 : 0,
        );
        expect(records.filter((record) => record.ownerId === OTHER_OWNER)).toHaveLength(1);
      }
      const connection = await ctx.db.query("calendarConnections").unique();
      if (operation === "disconnect") {
        expect(connection).toBeNull();
      } else {
        expect(connection).toMatchObject({
          googleAccountId: account.id,
          externalChangesVersion: 1,
        });
        expect(connection?.disconnecting).toBeUndefined();
      }
      expect(await ctx.db.query("calendarSyncOperations").collect()).toEqual([]);
    });
    const deletionCount = vi.mocked(deleteEvent).mock.calls.length;
    await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 2,
      ownerId: OWNER,
      calendarId: CALENDAR,
      googleEventId: "late-legacy",
      change: { kind: "delete" },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(deleteEvent).toHaveBeenCalledTimes(deletionCount);
  },
);
