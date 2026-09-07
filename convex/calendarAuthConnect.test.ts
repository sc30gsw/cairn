import { convexTest } from "convex-test";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import { GOOGLE_CALENDAR_WRITE_SCOPES } from "./lib/calendarSync";
import schema from "./schema";
import { changeOutput } from "./services/calendarSync/changeOutput";
import { connect as connectCalendar } from "./services/calendarSync/connect";

vi.mock("./services/calendarSync/connect", () => ({ connect: vi.fn() }));
vi.mock("./services/calendarSync/changeOutput", () => ({ changeOutput: vi.fn() }));

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./betterAuth/**"]);
const authModules = import.meta.glob("./betterAuth/**/*.ts");
const SCOPES = GOOGLE_CALENDAR_WRITE_SCOPES.join(" ");

async function setup({
  calendarId,
  ownerId = "owner",
  purpose = "read",
}: { calendarId?: string; ownerId?: string; purpose?: "read" | "write" } = {}) {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, authModules);
  const fixture = await t.run(async (ctx) => {
    for (const subject of ["personal", "work"]) {
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "account",
          data: {
            accountId: subject,
            createdAt: 1,
            providerId: "google",
            scope: SCOPES,
            updatedAt: 1,
            userId: ownerId,
          },
        },
      });
    }
    const connectionId = await ctx.db.insert("calendarConnections", {
      calendars: [],
      externalReadOnly: true,
      googleAccountId: "work",
      ownerId,
      primaryCalendarId: "work@example.com",
      status: "ok",
      visibleCalendarIds: [],
    });
    const requestId = await ctx.db.insert("calendarAuthorizationRequests", {
      calendarId,
      expiresAt: Date.now() + 600000,
      googleAccountId: "work",
      ownerId,
      purpose,
      state: "authorized",
    });
    return { connectionId, requestId };
  });
  return { t, owner: t.withIdentity({ subject: "owner" }), ...fixture };
}

beforeEach(() => {
  vi.mocked(connectCalendar).mockReset().mockResolvedValue("ok");
  vi.mocked(changeOutput).mockReset().mockResolvedValue("ok");
});

test("公開 connect は未ログインと別所有者の要求を Google 呼び出し前に拒否する", async () => {
  const { t, owner, requestId } = await setup({ ownerId: "other" });
  await expect(t.action(api.actions.calendarSync.connect.connect, { requestId })).rejects.toThrow();
  await expect(
    owner.action(api.actions.calendarSync.connect.connect, { requestId }),
  ).rejects.toThrow();
  expect(connectCalendar).not.toHaveBeenCalled();
});

test("同期中は要求を消費せず busy を返し、同じ要求で再試行できる", async () => {
  const { t, owner, requestId } = await setup();
  const operationId = await t.run((ctx) =>
    ctx.db.insert("calendarSyncOperations", {
      ownerId: "owner",
      expiresAt: Date.now() + 600000,
    }),
  );
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe("busy");
  expect(
    (await t.run((ctx) => ctx.db.get("calendarAuthorizationRequests", requestId)))?.state,
  ).toBe("authorized");
  expect(connectCalendar).not.toHaveBeenCalled();
  await t.run((ctx) => ctx.db.delete("calendarSyncOperations", operationId));
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe("ok");
  expect(connectCalendar).toHaveBeenCalledTimes(1);
});

test("公開 connect は要求に確定した subject を渡し、一覧の先頭を使わない", async () => {
  const { owner, requestId } = await setup();
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe("ok");
  expect(connectCalendar).toHaveBeenCalledWith(expect.anything(), "owner", "work");
  expect(changeOutput).not.toHaveBeenCalled();
});

test("書き込み権限の再認可だけでは保存先を変更しない", async () => {
  const { owner, requestId } = await setup({ purpose: "write" });
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe("ok");
  expect(changeOutput).not.toHaveBeenCalled();
});

test("保存先の追加認可は確定した接続とカレンダーを使い、移動中を返す", async () => {
  const { owner, requestId, connectionId } = await setup({ calendarId: "study", purpose: "write" });
  vi.mocked(changeOutput).mockResolvedValue("moving");
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe(
    "moving",
  );
  expect(changeOutput).toHaveBeenCalledWith(expect.anything(), {
    calendarId: "study",
    connectionId,
    ownerId: "owner",
  });
});

test("初回同期の失敗を返し、保存先変更を完了扱いにしない", async () => {
  const { owner, requestId } = await setup({ calendarId: "study", purpose: "write" });
  vi.mocked(connectCalendar).mockResolvedValue("error");
  expect(await owner.action(api.actions.calendarSync.connect.connect, { requestId })).toBe("error");
  expect(changeOutput).not.toHaveBeenCalled();
});

test("要求消費後の接続失敗を通知し、同じ要求で二重実行しない", async () => {
  const { t, owner, requestId } = await setup();
  vi.mocked(connectCalendar).mockRejectedValueOnce(new Error("Google 接続を再試行してください"));
  await expect(
    owner.action(api.actions.calendarSync.connect.connect, { requestId }),
  ).rejects.toThrow("再試行");
  expect(
    (await t.run((ctx) => ctx.db.get("calendarAuthorizationRequests", requestId)))?.state,
  ).toBe("consumed");
  await expect(
    owner.action(api.actions.calendarSync.connect.connect, { requestId }),
  ).rejects.toThrow();
  expect(connectCalendar).toHaveBeenCalledTimes(1);
});
