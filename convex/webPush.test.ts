import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { WEB_PUSH_ENV } from "./lib/webPush";
import schema from "./schema";

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));

vi.mock("web-push", () => ({ default: { sendNotification } }));

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
const OTHER = { email: "other@example.com", subject: "other-subject" };
const THURSDAY = "2026-08-20";

const SUBSCRIPTION_A = {
  endpoint: "https://push.example/a",
  keys: { auth: "auth-a", p256dh: "p256dh-a" },
};
const SUBSCRIPTION_B = {
  endpoint: "https://push.example/b",
  expirationTime: 1_800_000_000_000,
  keys: { auth: "auth-b", p256dh: "p256dh-b" },
};

function raw() {
  return convexTest(schema, modules);
}

type Harness = ReturnType<typeof raw>;

function jstAt(dateJst: string, hour: number): number {
  return new Date(`${dateJst}T${String(hour).padStart(2, "0")}:00:00+09:00`).getTime();
}

type SettingsOverrides = Partial<
  Omit<Doc<"notificationSettings">, "_creationTime" | "_id" | "ownerId">
>;

async function seedDue(t: Harness, overrides: SettingsOverrides = {}): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("notificationSettings", {
      enabled: true,
      eveningHourJst: 21,
      ownerId: OWNER.subject,
      triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
      ...overrides,
    });
    await ctx.db.insert("goals", {
      activeDays: 0,
      confirmedMinutes: 0,
      content: "音読を1周",
      criterion: "1周できる",
      deadline: "2026-08-22",
      ownerId: OWNER.subject,
      type: "mastery",
    });
  });
}

async function scheduledFunctions(t: Harness) {
  return await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect());
}

async function notifications(t: Harness): Promise<Doc<"notifications">[]> {
  return await t.run(async (ctx) => ctx.db.query("notifications").collect());
}

//? 配信のテストは evaluate を通さず通知の行を直接置く（予約の副作用を切り離す）
async function seedNotification(t: Harness): Promise<Id<"notifications">> {
  return await t.run(async (ctx) => {
    const goalId = await ctx.db.insert("goals", {
      activeDays: 0,
      confirmedMinutes: 0,
      content: "音読を1周",
      criterion: "1周できる",
      deadline: "2026-08-22",
      ownerId: OWNER.subject,
      type: "mastery",
    });
    return await ctx.db.insert("notifications", {
      dedupeKey: `checkpointDeadline:${THURSDAY}`,
      ownerId: OWNER.subject,
      payload: {
        dateJst: THURSDAY,
        items: [{ content: "音読を1周", daysLeft: 2, deadline: "2026-08-22", goalId }],
        kind: "checkpointDeadline",
      },
    });
  });
}

async function subscriptionEndpoints(t: Harness): Promise<string[]> {
  const rows = await t.run(async (ctx) => ctx.db.query("pushSubscriptions").collect());
  return rows.map((row) => row.endpoint).sort();
}

beforeEach(() => {
  //? scheduler の runAfter(0) が背景で走らないよう時計を止める。予約の有無は _scheduled_functions で見る
  vi.useFakeTimers();
  sendNotification.mockReset();
  vi.stubEnv(WEB_PUSH_ENV.privateKey, "private-key");
  vi.stubEnv(WEB_PUSH_ENV.publicKey, "public-key");
  vi.stubEnv(WEB_PUSH_ENV.subject, "mailto:owner@example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

test("端末の購読は endpoint ごとに upsert され、所有者ごとに一覧でき、解除で消える", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const other = t.withIdentity(OTHER);

  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_A);
  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, {
    ...SUBSCRIPTION_A,
    keys: { auth: "auth-a2", p256dh: "p256dh-a2" },
  });
  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_B);
  await other.mutation(api.mutations.notifications.subscribePush.subscribePush, {
    ...SUBSCRIPTION_A,
    endpoint: "https://push.example/other",
  });

  const mine = await owner.query(api.queries.notifications.pushSubscriptions.pushSubscriptions, {});
  expect(mine.map((row) => row.endpoint).sort()).toEqual([
    SUBSCRIPTION_A.endpoint,
    SUBSCRIPTION_B.endpoint,
  ]);
  const stored = await t.run(async (ctx) => ctx.db.query("pushSubscriptions").collect());
  expect(stored.find((row) => row.endpoint === SUBSCRIPTION_A.endpoint)?.keys.auth).toBe("auth-a2");

  await owner.mutation(api.mutations.notifications.unsubscribePush.unsubscribePush, {
    endpoint: SUBSCRIPTION_A.endpoint,
  });
  expect(
    (await owner.query(api.queries.notifications.pushSubscriptions.pushSubscriptions, {})).map(
      (row) => row.endpoint,
    ),
  ).toEqual([SUBSCRIPTION_B.endpoint]);
  expect(await subscriptionEndpoints(t)).toEqual([
    SUBSCRIPTION_B.endpoint,
    "https://push.example/other",
  ]);
});

test("公開鍵は環境変数から配り、無ければ null", async () => {
  const t = raw().withIdentity(OWNER);
  expect(await t.query(api.queries.notifications.webPushConfig.webPushConfig, {})).toEqual({
    publicKey: "public-key",
  });
  vi.stubEnv(WEB_PUSH_ENV.publicKey, "");
  expect(await t.query(api.queries.notifications.webPushConfig.webPushConfig, {})).toEqual({
    publicKey: null,
  });
});

test("通知が作られると、端末があれば押し出しが1回だけ予約される", async () => {
  const t = raw();
  await seedDue(t);
  await t
    .withIdentity(OWNER)
    .mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_A);

  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 8),
  });

  const created = await notifications(t);
  expect(created).toHaveLength(1);
  const scheduled = await scheduledFunctions(t);
  expect(scheduled).toHaveLength(1);
  expect(scheduled[0]?.args).toEqual([{ notificationId: created[0]?._id }]);

  //? 同じ事実からは通知も押し出しも二度と作らない
  await t.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 8),
  });
  expect(await scheduledFunctions(t)).toHaveLength(1);
});

test("端末が無いか静穏時間なら押し出しは予約しないが、通知欄の行は作る", async () => {
  const noDevice = raw();
  await seedDue(noDevice);
  await noDevice.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 8),
  });
  expect(await notifications(noDevice)).toHaveLength(1);
  expect(await scheduledFunctions(noDevice)).toEqual([]);

  const quiet = raw();
  await seedDue(quiet, { quietFromHourJst: 7, quietToHourJst: 9 });
  await quiet
    .withIdentity(OWNER)
    .mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_A);
  await quiet.mutation(internal.mutations.notifications.evaluate.evaluate, {
    now: jstAt(THURSDAY, 8),
  });
  expect(await notifications(quiet)).toHaveLength(1);
  expect(await scheduledFunctions(quiet)).toEqual([]);
});

test("押し出しは端末ごとに送り、404 / 410 の端末だけを消す", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_A);
  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_B);
  const notificationId = await seedNotification(t);
  sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
    if (subscription.endpoint === SUBSCRIPTION_A.endpoint) {
      throw Object.assign(new Error("gone"), { statusCode: 410 });
    }
    return { body: "", headers: {}, statusCode: 201 };
  });

  await t.action(internal.actions.notifications.deliverWebPush.deliverWebPush, { notificationId });

  expect(sendNotification).toHaveBeenCalledTimes(2);
  const [, body, options] = sendNotification.mock.calls[0] ?? [];
  expect(JSON.parse(body as string)).toEqual({
    body: "・音読を1周（あと2日 / 2026-08-22）",
    tag: `checkpointDeadline:${THURSDAY}`,
    title: "チェックポイントの期限が近づいています",
    url: "/goals",
  });
  expect(options).toMatchObject({
    vapidDetails: {
      privateKey: "private-key",
      publicKey: "public-key",
      subject: "mailto:owner@example.com",
    },
  });
  expect(await subscriptionEndpoints(t)).toEqual([SUBSCRIPTION_B.endpoint]);
});

test("鍵が無い deployment では送らず、購読も消さない。通知が消えていれば何もしない", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.mutations.notifications.subscribePush.subscribePush, SUBSCRIPTION_A);
  const notificationId = await seedNotification(t);

  vi.stubEnv(WEB_PUSH_ENV.privateKey, "");
  await t.action(internal.actions.notifications.deliverWebPush.deliverWebPush, { notificationId });
  expect(sendNotification).not.toHaveBeenCalled();
  expect(await subscriptionEndpoints(t)).toEqual([SUBSCRIPTION_A.endpoint]);

  vi.stubEnv(WEB_PUSH_ENV.privateKey, "private-key");
  await t.run(async (ctx) => ctx.db.delete("notifications", notificationId));
  expect(
    await t.query(internal.queries.notifications.webPushDelivery.webPushDelivery, {
      notificationId,
    }),
  ).toBeNull();
  await t.action(internal.actions.notifications.deliverWebPush.deliverWebPush, { notificationId });
  expect(sendNotification).not.toHaveBeenCalled();
});
