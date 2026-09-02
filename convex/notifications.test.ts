import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { NOTIFICATION_LIST_LIMIT, NOTIFICATION_TTL_MS } from "./lib/notifications";
import type { RowStatus } from "./lib/validators";
import schema from "./schema";

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

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER_OWNER = { email: "other@example.com", subject: "other-subject" };
const MONDAY = "2026-08-17";
const THURSDAY = "2026-08-20";
const SATURDAY = "2026-08-22";
const SUNDAY = "2026-08-23";
const THURSDAY_WEEKDAY = 4;

function raw() {
  return convexTest(schema, modules);
}

function asOwner(identity: typeof OWNER = OWNER) {
  return raw().withIdentity(identity);
}

type Harness = ReturnType<typeof asOwner>;

function jstAt(dateJst: string, hour: number): number {
  return new Date(`${dateJst}T${String(hour).padStart(2, "0")}:00:00+09:00`).getTime();
}

type SettingsOverrides = Partial<
  Omit<Doc<"notificationSettings">, "_creationTime" | "_id" | "ownerId">
>;

async function seedSettings(
  t: Harness,
  ownerId: string = OWNER.subject,
  overrides: SettingsOverrides = {},
): Promise<Id<"notificationSettings">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("notificationSettings", {
      enabled: true,
      eveningHourJst: 21,
      ownerId,
      triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
      ...overrides,
    }),
  );
}

type CheckpointSeed = {
  achievedAt?: string;
  content?: string;
  deadline?: string;
  ownerId?: string;
};

async function seedCheckpoint(t: Harness, args: CheckpointSeed = {}): Promise<Id<"goals">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("goals", {
      activeDays: 0,
      confirmedMinutes: 0,
      content: args.content ?? "音読を1周",
      criterion: "1周できる",
      ownerId: args.ownerId ?? OWNER.subject,
      type: "mastery",
      ...(args.deadline === undefined ? {} : { deadline: args.deadline }),
      ...(args.achievedAt === undefined ? {} : { achievedAt: args.achievedAt }),
    }),
  );
}

async function seedItem(t: Harness, ownerId: string = OWNER.subject): Promise<Id<"items">> {
  return await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId,
      sortOrder: 0,
    });
    return await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId,
      sortOrder: 0,
    });
  });
}

async function seedDay(
  t: Harness,
  args: { dateJst: string; deletedAt?: number; ownerId?: string; statuses: readonly RowStatus[] },
): Promise<void> {
  const ownerId = args.ownerId ?? OWNER.subject;
  const itemId = await seedItem(t, ownerId);
  await t.run(async (ctx) => {
    const dayId = await ctx.db.insert("days", {
      dateJst: args.dateJst,
      ownerId,
      ...(args.deletedAt === undefined ? {} : { deletedAt: args.deletedAt }),
    });
    for (const [index, status] of args.statuses.entries()) {
      await ctx.db.insert("rows", {
        content: `Unit ${String(index)}`,
        dateJst: args.dateJst,
        dayId,
        itemId,
        minutes: 20,
        ownerId,
        sortOrder: index,
        status,
      });
    }
  });
}

async function seedPreset(t: Harness, lineCount: number, ownerId = OWNER.subject): Promise<void> {
  const itemId = await seedItem(t, ownerId);
  await t.run(async (ctx) => {
    await ctx.db.insert("presets", {
      lines: Array.from({ length: lineCount }, (_, index) => ({
        content: `Unit ${String(index)}`,
        itemId,
        minutes: 20,
      })),
      name: "木曜",
      ownerId,
      weekday: THURSDAY_WEEKDAY,
    });
  });
}

async function seedTarget(
  t: Harness,
  args: { confirmedMinutes: number; targetValue: number },
): Promise<void> {
  await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    await ctx.db.insert("targets", {
      categoryId,
      metric: "minutes",
      ownerId: OWNER.subject,
      targetValue: args.targetValue,
    });
    if (args.confirmedMinutes > 0) {
      const dayId = await ctx.db.insert("days", { dateJst: MONDAY, ownerId: OWNER.subject });
      await ctx.db.insert("rows", {
        content: "Unit 1",
        dateJst: MONDAY,
        dayId,
        itemId,
        minutes: args.confirmedMinutes,
        ownerId: OWNER.subject,
        sortOrder: 0,
        status: "確定",
      });
    }
  });
}

async function notificationsOf(
  t: Harness,
  ownerId: string = OWNER.subject,
): Promise<Doc<"notifications">[]> {
  return await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
  );
}

async function settingsDoc(
  t: Harness,
  ownerId: string = OWNER.subject,
): Promise<Doc<"notificationSettings">> {
  const doc = await t.run(async (ctx) =>
    ctx.db
      .query("notificationSettings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique(),
  );
  if (doc === null) {
    throw new Error("expected notification settings");
  }
  return doc;
}

afterEach(() => {
  vi.useRealTimers();
});

test("設定行が無い所有者では通知が作られない(オプトイン)", async () => {
  const t = asOwner();
  await seedCheckpoint(t, { deadline: SUNDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t)).toEqual([]);
});

test("enabled: false では通知が作られない", async () => {
  const t = asOwner();
  await seedSettings(t, OWNER.subject, { enabled: false });
  await seedCheckpoint(t, { deadline: SUNDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t)).toEqual([]);
});

test("08時 JST・期限3日後の未達成チェックポイントで1件作られる", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedCheckpoint(t, { content: "音読を1周", deadline: SUNDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  const [notification, ...rest] = await notificationsOf(t);
  expect(rest).toEqual([]);
  expect(notification?.dedupeKey).toBe(`checkpointDeadline:${THURSDAY}`);
  if (notification?.payload.kind !== "checkpointDeadline") {
    throw new Error("expected checkpointDeadline payload");
  }
  expect(notification.payload.items).toEqual([
    { content: "音読を1周", daysLeft: 3, deadline: SUNDAY, goalId: expect.anything() },
  ]);
});

test("同じ now で2回評価しても通知は1件のまま(dedupe)", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedCheckpoint(t, { deadline: SUNDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });
  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t)).toHaveLength(1);
});

test("期限が4日後・前日(超過)・達成済みでは作られない", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedCheckpoint(t, { content: "4日後", deadline: "2026-08-24" });
  await seedCheckpoint(t, { content: "超過", deadline: "2026-08-19" });
  await seedCheckpoint(t, { achievedAt: THURSDAY, content: "達成済み", deadline: SUNDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t)).toEqual([]);
});

test("同日に接近が3件でも通知は1件で、payload に3要素が入る", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedCheckpoint(t, { content: "今日まで", deadline: THURSDAY });
  await seedCheckpoint(t, { content: "あと1日", deadline: "2026-08-21" });
  await seedCheckpoint(t, { content: "あと2日", deadline: SATURDAY });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  const [notification] = await notificationsOf(t);
  if (notification?.payload.kind !== "checkpointDeadline") {
    throw new Error("expected checkpointDeadline payload");
  }
  expect(notification.payload.items.map((item) => item.daysLeft)).toEqual([0, 1, 2]);
});

test("親を持たない期限つき習得(バックフィル前の孤児)でも作られる", async () => {
  const t = asOwner();
  await seedSettings(t);
  const goalId = await seedCheckpoint(t, { deadline: SUNDAY });
  const goal = await t.run(async (ctx) => ctx.db.get("goals", goalId));
  expect(goal?.type === "mastery" ? goal.parentGoalId : "unset").toBeUndefined();

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t)).toHaveLength(1);
});

test("土曜09時・未達ターゲットで1件。ターゲット0件と全件達成では作られない", async () => {
  const missed = asOwner();
  await seedSettings(missed);
  await seedTarget(missed, { confirmedMinutes: 60, targetValue: 180 });
  await missed.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(SATURDAY, 9),
  });
  const [notification] = await notificationsOf(missed);
  expect(notification?.dedupeKey).toBe(`weeklyTargetMiss:${MONDAY}`);
  if (notification?.payload.kind !== "weeklyTargetMiss") {
    throw new Error("expected weeklyTargetMiss payload");
  }
  expect(notification.payload.shortfalls).toEqual([
    { categoryName: "TOEIC対策", current: 60, metric: "minutes", targetValue: 180 },
  ]);

  const noTargets = asOwner();
  await seedSettings(noTargets);
  await noTargets.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(SATURDAY, 9),
  });
  expect(await notificationsOf(noTargets)).toEqual([]);

  const achieved = asOwner();
  await seedSettings(achieved);
  await seedTarget(achieved, { confirmedMinutes: 200, targetValue: 180 });
  await achieved.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(SATURDAY, 9),
  });
  expect(await notificationsOf(achieved)).toEqual([]);
});

test("日曜09時では週間ターゲットの通知が作られない", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedTarget(t, { confirmedMinutes: 0, targetValue: 180 });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(SUNDAY, 9) });

  expect(await notificationsOf(t)).toEqual([]);
});

test("21時 JST・今日の未着手2件で source: day / pendingCount: 2", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedDay(t, { dateJst: THURSDAY, statuses: ["未着手", "未着手", "確定"] });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  const [notification] = await notificationsOf(t);
  expect(notification?.dedupeKey).toBe(`eveningUntouched:${THURSDAY}`);
  expect(notification?.payload).toEqual({
    dateJst: THURSDAY,
    kind: "eveningUntouched",
    pendingCount: 2,
    source: "day",
  });
});

test("21時 JST・日なし・その曜日のプリセット3行で source: preset / pendingCount: 3", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedPreset(t, 3);

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  const [notification] = await notificationsOf(t);
  expect(notification?.payload).toEqual({
    dateJst: THURSDAY,
    kind: "eveningUntouched",
    pendingCount: 3,
    source: "preset",
  });
});

test("21時 JST・日なし・プリセットなしでは作られない", async () => {
  const t = asOwner();
  await seedSettings(t);

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  expect(await notificationsOf(t)).toEqual([]);
});

test("未着手0件(確定とスキップだけ)では作られない", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedDay(t, { dateJst: THURSDAY, statuses: ["確定", "スキップ"] });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  expect(await notificationsOf(t)).toEqual([]);
});

test("進行中だけが残っているときは催促しない", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedDay(t, { dateJst: THURSDAY, statuses: ["進行中"] });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  expect(await notificationsOf(t)).toEqual([]);
});

test("今日の日がゴミ箱にあるときはプリセット分岐に落ちる", async () => {
  const t = asOwner();
  await seedSettings(t);
  await seedDay(t, { dateJst: THURSDAY, deletedAt: jstAt(THURSDAY, 10), statuses: ["未着手"] });
  await seedPreset(t, 2);

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });

  const [notification] = await notificationsOf(t);
  expect(notification?.payload).toEqual({
    dateJst: THURSDAY,
    kind: "eveningUntouched",
    pendingCount: 2,
    source: "preset",
  });
});

test("eveningHourJst: 18 の所有者は18時に発火し、21時には発火しない", async () => {
  const early = asOwner();
  await seedSettings(early, OWNER.subject, { eveningHourJst: 18 });
  await seedDay(early, { dateJst: THURSDAY, statuses: ["未着手"] });
  await early.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 18),
  });
  expect(await notificationsOf(early)).toHaveLength(1);

  const late = asOwner();
  await seedSettings(late, OWNER.subject, { eveningHourJst: 18 });
  await seedDay(late, { dateJst: THURSDAY, statuses: ["未着手"] });
  await late.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });
  expect(await notificationsOf(late)).toEqual([]);
});

test("triggers.eveningUntouched: false で夜だけ止まり、期限接近は出る", async () => {
  const t = asOwner();
  await seedSettings(t, OWNER.subject, {
    triggers: { checkpointDeadline: true, eveningUntouched: false, weeklyTargetMiss: true },
  });
  await seedCheckpoint(t, { deadline: SUNDAY });
  await seedDay(t, { dateJst: THURSDAY, statuses: ["未着手"] });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 21),
  });
  expect(await notificationsOf(t)).toEqual([]);

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });
  const kinds = (await notificationsOf(t)).map((doc) => doc.payload.kind);
  expect(kinds).toEqual(["checkpointDeadline"]);
});

test("settings query は行が無いとき既定値(enabled: false)を返す", async () => {
  const settings = await asOwner().query(api.queries.notifications.settings.settings, {});

  expect(settings).toEqual({
    enabled: false,
    eveningHourJst: 21,
    quietFromHourJst: 22,
    quietToHourJst: 7,
    triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
  });
});

const SAVE_BASE = {
  enabled: true,
  eveningHourJst: 21,
  quietFromHourJst: 22,
  quietToHourJst: 7,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
};

test("saveSettings は範囲外の時刻を拒否する", async () => {
  const t = asOwner();
  await expect(
    t.mutation(api.mutations.notifications.saveSettings.saveSettings, {
      ...SAVE_BASE,
      eveningHourJst: 9,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.notifications.saveSettings.saveSettings, {
      ...SAVE_BASE,
      eveningHourJst: 24,
    }),
  ).rejects.toThrow();
});

test("saveSettings は2回目以降も1行のまま上書きする(upsert)", async () => {
  const t = asOwner();
  const first = await t.mutation(api.mutations.notifications.saveSettings.saveSettings, SAVE_BASE);

  const second = await t.mutation(api.mutations.notifications.saveSettings.saveSettings, {
    ...SAVE_BASE,
    eveningHourJst: 19,
    triggers: { checkpointDeadline: false, eveningUntouched: true, weeklyTargetMiss: true },
  });

  expect(second).toBe(first);
  const doc = await settingsDoc(t);
  expect(doc.eveningHourJst).toBe(19);
  expect(doc.triggers.checkpointDeadline).toBe(false);
});

async function seedOneNotification(t: Harness, ownerId: string = OWNER.subject) {
  return await t.run(async (ctx) =>
    ctx.db.insert("notifications", {
      dedupeKey: `eveningUntouched:${THURSDAY}`,
      ownerId,
      payload: {
        dateJst: THURSDAY,
        kind: "eveningUntouched",
        pendingCount: 1,
        source: "day",
      },
    }),
  );
}

test("markRead は他人の通知 id を拒否する(IDOR)", async () => {
  const other = asOwner(OTHER_OWNER);
  const notificationId = await seedOneNotification(other, OTHER_OWNER.subject);

  await expect(
    asOwner().mutation(api.mutations.notifications.markRead.markRead, {
      notificationIds: [notificationId],
    }),
  ).rejects.toThrow();
});

test("markRead は空配列で成功し、何も変わらない", async () => {
  const t = asOwner();
  const notificationId = await seedOneNotification(t);

  await expect(
    t.mutation(api.mutations.notifications.markRead.markRead, { notificationIds: [] }),
  ).resolves.toBeNull();

  const notification = await t.run(async (ctx) => ctx.db.get("notifications", notificationId));
  expect(notification?.readAt).toBeUndefined();
});

test("markRead は既読の行の readAt を上書きしない", async () => {
  const t = asOwner();
  const notificationId = await seedOneNotification(t);
  await t.mutation(api.mutations.notifications.markRead.markRead, {
    notificationIds: [notificationId],
  });
  const first = await t.run(async (ctx) => ctx.db.get("notifications", notificationId));

  await t.mutation(api.mutations.notifications.markRead.markRead, {
    notificationIds: [notificationId],
  });

  const second = await t.run(async (ctx) => ctx.db.get("notifications", notificationId));
  expect(second?.readAt).toBe(first?.readAt);
});

async function seedManyNotifications(t: Harness, count: number): Promise<void> {
  await t.run(async (ctx) => {
    for (let index = 0; index < count; index += 1) {
      await ctx.db.insert("notifications", {
        dedupeKey: `seed:${String(index)}`,
        ownerId: OWNER.subject,
        payload: {
          dateJst: THURSDAY,
          kind: "eveningUntouched",
          pendingCount: index,
          source: "day",
        },
      });
    }
  });
}

test("markAllRead は通知欄に出ていない未読も含めて全件既読にする", async () => {
  const t = asOwner();
  const total = NOTIFICATION_LIST_LIMIT + 5;
  await seedManyNotifications(t, total);

  await t.mutation(api.mutations.notifications.markAllRead.markAllRead, {});

  const page = await t.query(api.queries.notifications.list.list, {});
  expect(page.unreadCount).toBe(0);
  const unread = (await notificationsOf(t)).filter((doc) => doc.readAt === undefined);
  expect(unread).toEqual([]);
  expect(total).toBeGreaterThan(NOTIFICATION_LIST_LIMIT);
});

test("markAllRead は未読0件でも成功する", async () => {
  await expect(
    asOwner().mutation(api.mutations.notifications.markAllRead.markAllRead, {}),
  ).resolves.toBeNull();
});

test("list は新しい順に最大50件を返し、未読数は在庫全件から数える", async () => {
  const t = asOwner();
  await seedManyNotifications(t, NOTIFICATION_LIST_LIMIT + 5);

  const page = await t.query(api.queries.notifications.list.list, {});

  expect(page.items).toHaveLength(NOTIFICATION_LIST_LIMIT);
  expect(page.unreadCount).toBe(NOTIFICATION_LIST_LIMIT + 5);
  const times = page.items.map((item) => item._creationTime);
  expect(times).toEqual([...times].toSorted((left, right) => right - left));
  expect(page.items.every((item) => !item.read)).toBe(true);
});

test("list は他人の通知を返さない", async () => {
  const other = asOwner(OTHER_OWNER);
  await seedOneNotification(other, OTHER_OWNER.subject);

  const page = await asOwner().query(api.queries.notifications.list.list, {});

  expect(page.items).toEqual([]);
  expect(page.unreadCount).toBe(0);
});

test("purgeExpired は31日前を消し、29日前を残す", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const now = Date.UTC(2026, 7, 24, 0, 0, 0);
  const t = asOwner();

  vi.setSystemTime(new Date(now - NOTIFICATION_TTL_MS - 24 * 60 * 60 * 1000));
  await t.run(async (ctx) => {
    await ctx.db.insert("notifications", {
      dedupeKey: "old",
      ownerId: OWNER.subject,
      payload: { dateJst: THURSDAY, kind: "eveningUntouched", pendingCount: 1, source: "day" },
    });
  });
  vi.setSystemTime(new Date(now - NOTIFICATION_TTL_MS + 24 * 60 * 60 * 1000));
  await t.run(async (ctx) => {
    await ctx.db.insert("notifications", {
      dedupeKey: "recent",
      ownerId: OWNER.subject,
      payload: { dateJst: THURSDAY, kind: "eveningUntouched", pendingCount: 2, source: "day" },
    });
  });

  await t.mutation(internal.mutations.notifications.purgeExpired.purgeExpired, { now });

  expect((await notificationsOf(t)).map((doc) => doc.dedupeKey)).toEqual(["recent"]);
});

test("未認証では通知の公開関数がすべて失敗する", async () => {
  const t = raw();

  await expect(t.query(api.queries.notifications.list.list, {})).rejects.toThrow();
  await expect(t.query(api.queries.notifications.settings.settings, {})).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.notifications.saveSettings.saveSettings, SAVE_BASE),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.notifications.markRead.markRead, { notificationIds: [] }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.notifications.markAllRead.markAllRead, {}),
  ).rejects.toThrow();
});

test("所有者Aの評価は所有者Bの通知を作らない", async () => {
  const t = asOwner();
  await seedSettings(t, OWNER.subject);
  await seedCheckpoint(t, { deadline: SUNDAY, ownerId: OWNER.subject });
  await seedCheckpoint(t, { deadline: SUNDAY, ownerId: OTHER_OWNER.subject });

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, { now: jstAt(THURSDAY, 8) });

  expect(await notificationsOf(t, OWNER.subject)).toHaveLength(1);
  expect(await notificationsOf(t, OTHER_OWNER.subject)).toEqual([]);
});

test("purgeExpired は now 省略時に現在時刻を使い、新しい通知を消さない", async () => {
  const t = asOwner();
  await seedOneNotification(t);

  await t.mutation(internal.mutations.notifications.purgeExpired.purgeExpired, {});

  expect(await notificationsOf(t)).toHaveLength(1);
});
