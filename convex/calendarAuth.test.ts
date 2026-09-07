import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api, components, internal } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import { GOOGLE_CALENDAR_READ_SCOPES, GOOGLE_CALENDAR_SCOPE } from "./lib/calendarSync";
import schema from "./schema";
import { authorizeRequest, beginRequest, consumeRequest } from "./services/calendarAuth/requests";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./betterAuth/**"]);
const authModules = import.meta.glob("./betterAuth/**/*.ts");
const SCOPES = GOOGLE_CALENDAR_READ_SCOPES.join(" ");

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, authModules);
  return t;
}

async function seedAccount(
  t: ReturnType<typeof setup>,
  subject: string,
  ownerId = "owner",
  scope = SCOPES,
) {
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          accountId: subject,
          createdAt: 1,
          providerId: "google",
          scope,
          updatedAt: 1,
          userId: ownerId,
        },
      },
    }),
  );
}

afterEach(() => vi.useRealTimers());

test("未ログインではカレンダー接続要求を発行できない", async () => {
  const t = setup();
  await expect(
    t.mutation(api.mutations.calendarAuth.begin.begin, { purpose: "read" }),
  ).rejects.toThrow();
});

test("追加 account のログインを保存前から禁止し、権限保存後のみ要求を1回消費する", async () => {
  const t = setup();
  const request = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work",
        ownerId: "owner",
        requestId: request.requestId,
      }),
    ),
  ).toBe(true);
  expect(
    await t.query(internal.queries.calendarAuth.canSignIn.canSignIn, { googleAccountId: "work" }),
  ).toBe(false);
  expect(
    await t.run(async (ctx) =>
      Result.isError(await consumeRequest(ctx, "owner", request.requestId)),
    ),
  ).toBe(true);
  await seedAccount(t, "work");
  expect(
    await t.run(async (ctx) =>
      Result.unwrap(await consumeRequest(ctx, "owner", request.requestId)),
    ),
  ).toEqual({ googleAccountId: "work", purpose: "read" });
  expect(
    await t.run(async (ctx) =>
      Result.isError(await consumeRequest(ctx, "owner", request.requestId)),
    ),
  ).toBe(true);
  expect(
    await t.query(internal.queries.calendarAuth.canSignIn.canSignIn, { googleAccountId: "work" }),
  ).toBe(false);
});

test("既存 Google account のログイン権限を再認可でも維持する", async () => {
  const t = setup();
  await seedAccount(t, "personal");
  const request = await t.run(async (ctx) =>
    Result.unwrap(
      await beginRequest(ctx, "owner", { googleAccountId: "personal", purpose: "read" }),
    ),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "personal",
        ownerId: "owner",
        requestId: request.requestId,
      }),
    ),
  ).toBe(true);
  expect(
    await t.query(internal.queries.calendarAuth.canSignIn.canSignIn, {
      googleAccountId: "personal",
    }),
  ).toBe(true);
});

test("カレンダー専用アカウントは再認可と要求清掃でログイン可能にならない", async () => {
  const t = setup();
  const first = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  await t.run((ctx) =>
    authorizeRequest(ctx, {
      googleAccountId: "work",
      ownerId: "owner",
      requestId: first.requestId,
    }),
  );
  await seedAccount(t, "work");
  const second = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { googleAccountId: "work", purpose: "read" })),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work",
        ownerId: "owner",
        requestId: second.requestId,
      }),
    ),
  ).toBe(true);
  await t.run((ctx) => ctx.db.delete("calendarAuthorizationRequests", first.requestId));
  expect(
    await t.query(internal.queries.calendarAuth.canSignIn.canSignIn, { googleAccountId: "work" }),
  ).toBe(false);
});

test("期限切れの要求を清掃しても Google のログイン禁止を残す", async () => {
  const t = setup();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const request = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  await t.run((ctx) =>
    authorizeRequest(ctx, {
      googleAccountId: "work",
      ownerId: "owner",
      requestId: request.requestId,
    }),
  );
  await t.mutation(internal.mutations.calendarAuth.expire.expire, { requestId: request.requestId });
  expect(
    await t.run((ctx) => ctx.db.get("calendarAuthorizationRequests", request.requestId)),
  ).not.toBeNull();
  vi.setSystemTime(601001);
  await t.mutation(internal.mutations.calendarAuth.expire.expire, { requestId: request.requestId });
  expect(
    await t.run((ctx) => ctx.db.get("calendarAuthorizationRequests", request.requestId)),
  ).toBeNull();
  expect(
    await t.query(internal.queries.calendarAuth.canSignIn.canSignIn, { googleAccountId: "work" }),
  ).toBe(false);
});

test("別所有者、期限切れ、再利用、再認可で別アカウント選択を拒否する", async () => {
  const t = setup();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  await seedAccount(t, "personal");
  const request = await t.run(async (ctx) =>
    Result.unwrap(
      await beginRequest(ctx, "owner", { googleAccountId: "personal", purpose: "read" }),
    ),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "personal",
        ownerId: "other",
        requestId: request.requestId,
      }),
    ),
  ).toBe(false);
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work",
        ownerId: "owner",
        requestId: request.requestId,
      }),
    ),
  ).toBe(false);
  vi.setSystemTime(601001);
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "personal",
        ownerId: "owner",
        requestId: request.requestId,
      }),
    ),
  ).toBe(false);
});

test("別タブの要求は選ばれた Google subject に個別に対応する", async () => {
  const t = setup();
  const first = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  const second = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work-a",
        ownerId: "owner",
        requestId: second.requestId,
      }),
    ),
  ).toBe(true);
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work-b",
        ownerId: "owner",
        requestId: first.requestId,
      }),
    ),
  ).toBe(true);
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "work-c",
        ownerId: "owner",
        requestId: second.requestId,
      }),
    ),
  ).toBe(false);
  await seedAccount(t, "work-a");
  await seedAccount(t, "work-b");
  expect(
    (
      await t.run(async (ctx) =>
        Result.unwrap(await consumeRequest(ctx, "owner", second.requestId)),
      )
    ).googleAccountId,
  ).toBe("work-a");
  expect(
    (await t.run(async (ctx) => Result.unwrap(await consumeRequest(ctx, "owner", first.requestId))))
      .googleAccountId,
  ).toBe("work-b");
});

test("他の所有者に紐づく Google account を追加できない", async () => {
  const t = setup();
  await seedAccount(t, "someone", "other");
  const request = await t.run(async (ctx) =>
    Result.unwrap(await beginRequest(ctx, "owner", { purpose: "read" })),
  );
  expect(
    await t.run((ctx) =>
      authorizeRequest(ctx, {
        googleAccountId: "someone",
        ownerId: "owner",
        requestId: request.requestId,
      }),
    ),
  ).toBe(false);
});

test("書き込み先の再認可は所有者・Google account・calendarId・権限を維持する", async () => {
  const t = setup();
  await seedAccount(t, "work");
  const request = await t.run(async (ctx) =>
    Result.unwrap(
      await beginRequest(ctx, "owner", {
        calendarId: "study",
        googleAccountId: "work",
        purpose: "write",
      }),
    ),
  );
  expect(request.scopes).toContain(GOOGLE_CALENDAR_SCOPE.writeEvents);
  await t.run((ctx) =>
    authorizeRequest(ctx, {
      googleAccountId: "work",
      ownerId: "owner",
      requestId: request.requestId,
    }),
  );
  expect(
    await t.run(async (ctx) =>
      Result.isError(await consumeRequest(ctx, "owner", request.requestId)),
    ),
  ).toBe(true);
});

test("書き込み権限の再認可だけなら書き込み先を選び直さずに要求を完了できる", async () => {
  const t = setup();
  await seedAccount(t, "work", "owner", `${SCOPES} ${GOOGLE_CALENDAR_SCOPE.writeEvents}`);
  const request = await t
    .withIdentity({ subject: "owner" })
    .mutation(api.mutations.calendarAuth.begin.begin, {
      googleAccountId: "work",
      purpose: "write",
    });
  expect(request.scopes).toContain(GOOGLE_CALENDAR_SCOPE.writeEvents);
  await t.run((ctx) =>
    authorizeRequest(ctx, {
      googleAccountId: "work",
      ownerId: "owner",
      requestId: request.requestId,
    }),
  );
  expect(
    await t.mutation(internal.mutations.calendarAuth.consume.consume, {
      ownerId: "owner",
      requestId: request.requestId,
    }),
  ).toEqual({ googleAccountId: "work", purpose: "write" });
});

test("書き込み先の変更を伴わない再認可でも他の所有者のアカウントを拒否する", async () => {
  const t = setup();
  await seedAccount(t, "work", "other", `${SCOPES} ${GOOGLE_CALENDAR_SCOPE.writeEvents}`);
  await expect(
    t.withIdentity({ subject: "owner" }).mutation(api.mutations.calendarAuth.begin.begin, {
      googleAccountId: "work",
      purpose: "write",
    }),
  ).rejects.toThrow("再接続できません");
});
