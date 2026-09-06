import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  deleteEvent,
  GoogleCalendarError,
  insertEvent,
  listEvents,
  patchEvent,
} from "./lib/googleCalendar";
import type { GoalInput } from "./lib/validators";
import schema from "./schema";

vi.mock("./lib/googleAccessToken", () => ({
  getGoogleAccessToken: async () => Result.ok("test-token"),
}));

vi.mock("./lib/googleCalendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/googleCalendar")>()),
  deleteEvent: vi.fn(),
  insertEvent: vi.fn(),
  listEvents: vi.fn(),
  patchEvent: vi.fn(),
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

const OWNER = "calendar-owner";
const CALENDAR = "owner@example.com";
const NOW = Date.parse("2026-08-17T12:00:00+09:00");
const GOAL = {
  content: "最初の目標",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} satisfies GoalInput;

const googleEvents = new Map<string, string>();
let eventSequence = 0;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  googleEvents.clear();
  eventSequence = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("unexpected network request");
    }),
  );
  vi.mocked(insertEvent).mockImplementation(async (_client, _calendar, payload) => {
    eventSequence += 1;
    const id = `event-${String(eventSequence)}`;
    googleEvents.set(id, payload.summary);
    return Result.ok({ ...payload, id, updated: new Date(NOW).toISOString() });
  });
  vi.mocked(patchEvent).mockImplementation(async (_client, _calendar, id, payload) => {
    if (!("summary" in payload)) throw new Error("expected source event payload");
    googleEvents.set(id, payload.summary);
    return Result.ok({ id, summary: payload.summary, updated: new Date(NOW).toISOString() });
  });
  vi.mocked(deleteEvent).mockImplementation(async (_client, _calendar, id) => {
    googleEvents.delete(id);
    return Result.ok(undefined);
  });
  vi.mocked(listEvents).mockResolvedValue(Result.ok({ items: [], nextSyncToken: "next" }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function connected() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: OWNER });
  const goalId = await owner.mutation(api.mutations.goals.create.create, { goal: GOAL });
  await t.run(async (ctx) => {
    await ctx.db.insert("calendarConnections", {
      calendars: [{ accessRole: "owner", id: CALENDAR, primary: true, summary: "予定" }],
      googleAccountId: "google-owner",
      ownerId: OWNER,
      primaryCalendarId: CALENDAR,
      status: "ok",
      visibleCalendarIds: [CALENDAR],
    });
  });
  return { goalId, owner, t };
}

function push(t: ReturnType<typeof convexTest>, goalId: Id<"goals">) {
  return t.action(internal.actions.calendarSync.pushSource.pushSource, {
    attempt: 0,
    ownerId: OWNER,
    sourceId: goalId,
    sourceKind: "goal",
  });
}

function signal() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

test("同じ所有者の操作を排他し、別の所有者と解放後の操作を許可する", async () => {
  const t = convexTest(schema, modules);
  const acquire = (ownerId: string) =>
    t.mutation(internal.mutations.calendarSync.acquireOperation.acquireOperation, { ownerId });
  const operationId = await acquire(OWNER);
  expect(operationId).not.toBeNull();
  expect(await acquire(OWNER)).toBeNull();
  expect(await acquire("another-owner")).not.toBeNull();
  if (operationId === null) throw new Error("expected acquired operation");
  await t.mutation(internal.mutations.calendarSync.releaseOperation.releaseOperation, {
    operationId,
  });
  expect(await acquire(OWNER)).not.toBeNull();
});

test("期限切れの操作を回復し、古い処理の解放で新しい操作を消さない", async () => {
  const t = convexTest(schema, modules);
  const acquire = () =>
    t.mutation(internal.mutations.calendarSync.acquireOperation.acquireOperation, {
      ownerId: OWNER,
    });
  const expiredId = await acquire();
  if (expiredId === null) throw new Error("expected acquired operation");
  vi.setSystemTime(NOW + 11 * 60 * 1000);
  const replacementId = await acquire();
  expect(replacementId).not.toBeNull();
  expect(replacementId).not.toBe(expiredId);
  await t.mutation(internal.mutations.calendarSync.releaseOperation.releaseOperation, {
    operationId: expiredId,
  });
  expect(await acquire()).toBeNull();
  expect(
    await t.run(async (ctx) => ctx.db.query("calendarSyncOperations").collect()),
  ).toMatchObject([{ _id: replacementId, ownerId: OWNER }]);
});

test.each([
  ["insert", "update"],
  ["insert", "remove"],
  ["patch", "update"],
  ["patch", "remove"],
] as const)("%s送信中の%sを最後まで反映し、Google予定を重複させない", async (phase, change) => {
  const { goalId, owner, t } = await connected();
  if (phase === "patch") {
    await push(t, goalId);
    await owner.mutation(api.mutations.goals.update.update, {
      goalId,
      goal: { ...GOAL, content: "送信中の目標" },
    });
  }
  const entered = signal();
  const resume = signal();
  const method = phase === "insert" ? vi.mocked(insertEvent) : vi.mocked(patchEvent);
  if (phase === "insert") {
    vi.mocked(insertEvent).mockImplementationOnce(async (_client, _calendar, payload) => {
      googleEvents.set("event-1", payload.summary);
      entered.resolve();
      await resume.promise;
      return Result.ok({ ...payload, id: "event-1", updated: new Date(NOW).toISOString() });
    });
  } else {
    vi.mocked(patchEvent).mockImplementationOnce(async (_client, _calendar, id, payload) => {
      if (!("summary" in payload)) throw new Error("expected source event payload");
      googleEvents.set(id, payload.summary);
      entered.resolve();
      await resume.promise;
      return Result.ok({ id, summary: payload.summary, updated: new Date(NOW).toISOString() });
    });
  }
  const sending = push(t, goalId);
  await entered.promise;
  expect(method).toHaveBeenCalled();
  if (change === "update") {
    await owner.mutation(api.mutations.goals.update.update, {
      goalId,
      goal: { ...GOAL, content: "最後の目標" },
    });
  } else {
    await owner.mutation(api.mutations.goals.remove.remove, { goalId });
  }
  resume.resolve();
  await sending;
  expect([...googleEvents.entries()]).toEqual(
    change === "update" ? [["event-1", "本番: 最後の目標"]] : [],
  );
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(insertEvent).toHaveBeenCalledTimes(1);
  const links = await t.run(async (ctx) => ctx.db.query("calendarSyncLinks").collect());
  if (change === "update") {
    expect([...googleEvents.entries()]).toEqual([["event-1", "本番: 最後の目標"]]);
    expect(links).toMatchObject([{ googleEventId: "event-1", sourceId: goalId }]);
    expect(links).toHaveLength(1);
    expect(links[0]?.appChangedAt).toBeUndefined();
  } else {
    expect(googleEvents.size).toBe(0);
    expect(links).toEqual([]);
    expect(await t.run(async (ctx) => ctx.db.get("goals", goalId))).toBeNull();
  }
  expect(await t.run(async (ctx) => ctx.db.query("calendarSyncOperations").collect())).toEqual([]);
});

test("解除の部分失敗後は通常同期が削除を取り込まず、解除の再試行で完了する", async () => {
  const { goalId, owner, t } = await connected();
  await push(t, goalId);
  const otherGoalId = await owner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "途中の目標",
      criterion: "完了する",
      deadline: "2026-09-30",
      parentGoalId: goalId,
      type: "mastery",
    },
  });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(googleEvents.size).toBe(2);
  vi.mocked(deleteEvent)
    .mockImplementationOnce(async (_client, _calendar, id) => {
      googleEvents.delete(id);
      return Result.ok(undefined);
    })
    .mockResolvedValueOnce(
      Result.err(
        new GoogleCalendarError({
          message: "temporary failure",
          operation: "events.delete",
          reason: null,
          status: 503,
        }),
      ),
    );
  await expect(owner.action(api.actions.calendarSync.disconnect.disconnect, {})).rejects.toThrow();
  expect(googleEvents.size).toBe(1);
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("error");
  await t.action(internal.actions.calendarSync.syncOwner.syncOwner, { ownerId: OWNER });
  expect(listEvents).not.toHaveBeenCalled();
  await t.run(async (ctx) => {
    expect(await ctx.db.query("calendarSyncLinks").collect()).toHaveLength(2);
    expect(await ctx.db.get("goals", goalId)).not.toBeNull();
    expect(await ctx.db.get("goals", otherGoalId)).not.toBeNull();
    expect(await ctx.db.query("calendarConnections").unique()).toMatchObject({
      disconnecting: true,
    });
    expect(await ctx.db.query("calendarSyncOperations").collect()).toEqual([]);
  });
  await owner.action(api.actions.calendarSync.disconnect.disconnect, {});
  expect(googleEvents.size).toBe(0);
  await t.run(async (ctx) => {
    expect(await ctx.db.query("calendarConnections").collect()).toEqual([]);
    expect(await ctx.db.query("calendarSyncLinks").collect()).toEqual([]);
  });
});
