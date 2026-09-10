import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api, internal } from "./_generated/api";
import type { PulledEvent } from "./lib/validators";
import schema from "./schema";

const event = {
  allDay: false,
  calendarId: "shared",
  googleEventId: "meeting",
  kind: "upsert",
  startAt: "2026-09-07 10:00:00",
  endAt: "2026-09-07 11:00:00",
  title: "会議",
  updated: "2026-09-07T00:00:00Z",
} as const satisfies PulledEvent;

async function setup() {
  const t = convexTest(schema, convexModules);
  const personal = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      ownerId: "owner",
      googleAccountId: "personal",
      primaryCalendarId: "shared",
      status: "ok",
      calendars: [{ id: "shared", summary: "共有", primary: true, accessRole: "owner" }],
      visibleCalendarIds: ["shared"],
    }),
  );
  const work = await t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
    ownerId: "owner",
    googleAccountId: "work",
    googleEmail: "work@example.com",
    canWrite: false,
    calendars: [{ id: "shared", summary: "仕事", primary: true, accessRole: "owner" }],
    defaultVisibleCalendarIds: ["shared"],
  });
  const third = await t.mutation(
    internal.mutations.calendarSync.upsertConnection.upsertConnection,
    {
      ownerId: "owner",
      googleAccountId: "third",
      googleEmail: "third@example.com",
      canWrite: false,
      calendars: [{ id: "third", summary: "副業", primary: true, accessRole: "writer" }],
      defaultVisibleCalendarIds: ["third"],
    },
  );
  return { t, owner: t.withIdentity({ subject: "owner" }), personal, work, third };
}

test("既存の接続・出力を維持しながら3アカウントを保持する", async () => {
  const { owner, personal } = await setup();
  const status = await owner.query(api.queries.calendarSync.status.status, {});
  expect(status.connections).toHaveLength(3);
  expect(status.output).toEqual({ connectionId: personal, calendarId: "shared" });
  expect(status.connections.map((c) => c.externalReadOnly)).toEqual([false, true, true]);
});

test("同じ実カレンダーとeventIdを統合し非表示の仕事接続の保護も維持する", async () => {
  const { t, owner, personal, work } = await setup();
  for (const connectionId of [personal, work]) {
    await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
      connectionId,
      ownerId: "owner",
      calendarId: "shared",
      events: [event],
      finish: null,
      todayJst: "2026-09-07",
    });
  }
  const events = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-07",
    view: "day",
  });
  expect(events).toHaveLength(1);
  expect(events[0]?.canEdit).toBe(false);
  await owner.mutation(api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars, {
    connectionId: work,
    calendarIds: [],
  });
  const copies = await t.run((ctx) => ctx.db.query("externalCalendarEvents").collect());
  for (const copy of copies) {
    await expect(
      owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, {
        externalId: copy._id,
      }),
    ).rejects.toThrow(/権限/);
  }
});

test("明示的な削除を別接続の古い結果が復活させない", async () => {
  const { t, owner, personal, work } = await setup();
  const pull = { ownerId: "owner", calendarId: "shared", finish: null, todayJst: "2026-09-07" };
  await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
    ...pull,
    connectionId: personal,
    events: [event],
  });
  await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
    ...pull,
    connectionId: work,
    events: [
      {
        calendarId: "shared",
        googleEventId: "meeting",
        kind: "delete",
        updated: "2026-09-07T01:00:00Z",
      },
    ],
  });
  await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
    ...pull,
    connectionId: personal,
    events: [event],
  });
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-09-07",
      view: "day",
    }),
  ).toEqual([]);
});

test("他人の接続IDで表示設定を変更できない", async () => {
  const { t, work } = await setup();
  await expect(
    t
      .withIdentity({ subject: "other" })
      .mutation(api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars, {
        connectionId: work,
        calendarIds: [],
      }),
  ).rejects.toThrow();
});

test("閲覧専用接続を追加した後は古い未送信外部変更も再送できない", async () => {
  const { t, personal } = await setup();
  const pendingId = await t.run((ctx) =>
    ctx.db.insert("calendarExternalChanges", {
      connectionId: personal,
      ownerId: "owner",
      calendarId: "shared",
      googleEventId: "meeting",
      change: { kind: "delete" },
    }),
  );
  expect(
    await t.query(internal.queries.calendarSync.pendingExternalChange.pendingExternalChange, {
      pendingId,
    }),
  ).toBeNull();
});

test("再認可で一覧から消えた閲覧専用カレンダーの残存コピーも保護する", async () => {
  const { t, owner, personal, work } = await setup();
  for (const connectionId of [personal, work])
    await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
      connectionId,
      ownerId: "owner",
      calendarId: "shared",
      events: [event],
      finish: null,
      todayJst: "2026-09-07",
    });
  await t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
    ownerId: "owner",
    googleAccountId: "work",
    googleEmail: "work@example.com",
    canWrite: true,
    calendars: [{ id: "new", summary: "仕事", primary: true, accessRole: "owner" }],
    defaultVisibleCalendarIds: ["new"],
  });
  const listed = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-07",
    view: "day",
  });
  expect(listed).toHaveLength(1);
  expect(listed[0]?.canEdit).toBe(false);
  const copies = await t.run((ctx) => ctx.db.query("externalCalendarEvents").collect());
  for (const copy of copies)
    await expect(
      owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, {
        externalId: copy._id,
      }),
    ).rejects.toThrow(/権限/);
  const pendingId = await t.run((ctx) =>
    ctx.db.insert("calendarExternalChanges", {
      ownerId: "owner",
      connectionId: personal,
      calendarId: "shared",
      googleEventId: "meeting",
      change: { kind: "delete" },
    }),
  );
  expect(
    await t.query(internal.queries.calendarSync.pendingExternalChange.pendingExternalChange, {
      pendingId,
    }),
  ).toBeNull();
});

test("初回接続は外部予定を編集でき、追加接続だけが閲覧専用になり、再接続でも編集権を保つ", async () => {
  const t = convexTest(schema, convexModules);
  const upsert = (googleAccountId: string) =>
    t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
      ownerId: "fresh",
      googleAccountId,
      googleEmail: `${googleAccountId}@example.com`,
      canWrite: true,
      calendars: [
        { id: googleAccountId, summary: googleAccountId, primary: true, accessRole: "owner" },
      ],
      defaultVisibleCalendarIds: [googleAccountId],
    });
  const readOnlyByAccount = async () =>
    (
      await t.withIdentity({ subject: "fresh" }).query(api.queries.calendarSync.status.status, {})
    ).connections.map((connection) => [connection.googleAccountId, connection.externalReadOnly]);
  const first = await upsert("first");
  await upsert("second");
  expect(await readOnlyByAccount()).toEqual([
    ["first", false],
    ["second", true],
  ]);
  await t.mutation(internal.mutations.calendarSync.clearConnection.clearConnection, {
    ownerId: "fresh",
    connectionId: first,
  });
  await upsert("first");
  expect(await readOnlyByAccount()).toEqual([
    ["second", true],
    ["first", false],
  ]);
});

test("外部予定は取得元の接続が閲覧専用かどうかを伝える", async () => {
  const { t, owner, personal, third } = await setup();
  for (const [connectionId, calendarId] of [
    [personal, "shared"],
    [third, "third"],
  ] as const) {
    await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
      connectionId,
      ownerId: "owner",
      calendarId,
      events: [{ ...event, calendarId }],
      finish: null,
      todayJst: "2026-09-07",
    });
  }
  const events = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-07",
    view: "day",
  });
  expect(events.map((entry) => [entry.calendarId, entry.externalReadOnly]).sort()).toEqual([
    ["shared", false],
    ["third", true],
  ]);
});
