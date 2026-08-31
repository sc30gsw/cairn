import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
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
const OTHER_OWNER = { email: "other@example.com", subject: "other-owner-subject" };
const TODAY = "2026-08-31";

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

test("新規ユーザーのカタログは空(レーンも方法も seed しない)", async () => {
  const t = owner();
  expect(await t.query(api.queries.methods.list.list, {})).toEqual({ lanes: [], methods: [] });
});

test("未認証ではカタログを読めない", async () => {
  await expect(raw().query(api.queries.methods.list.list, {})).rejects.toThrow();
});

test("レーンと方法を作成でき、一覧に sortOrder つきで並ぶ", async () => {
  const t = owner();
  const examLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const wordLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "単語レーン",
  });
  const methodId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId: examLaneId,
    name: "公式問題集の3回法",
  });

  const catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.lanes).toEqual([
    { _id: examLaneId, name: "模試レーン", sortOrder: 0 },
    { _id: wordLaneId, name: "単語レーン", sortOrder: 1 },
  ]);
  expect(catalog.methods).toEqual([
    {
      _id: methodId,
      bodyText: "",
      completionHtml: "",
      laneId: examLaneId,
      memoHtml: "",
      name: "公式問題集の3回法",
      nowViewing: false,
      sortOrder: 0,
    },
  ]);
});

test("レーン名・方法タイトルの空文字と、レーン名の重複を拒否する", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.methods.createLane.createLane, { name: "  " }),
  ).rejects.toThrow();

  const laneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  await expect(
    t.mutation(api.mutations.methods.createLane.createLane, { name: "模試レーン" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.methods.createMethod.createMethod, { laneId, name: "  " }),
  ).rejects.toThrow();
});

test("方法の本文・完了条件・メモを保存できる(空も許す)", async () => {
  const t = owner();
  const laneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const methodId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "公式問題集の3回法",
  });

  await t.mutation(api.mutations.methods.updateMethod.updateMethod, {
    bodyText: "1回目は本番通り2時間で解く",
    completionHtml: '<ul data-type="taskList"><li data-checked="false">未知語ゼロ</li></ul>',
    memoHtml: '<p><a href="https://example.com">参考リンク</a></p>',
    methodId,
    name: "公式問題集の3回法",
  });

  const catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.methods[0]).toMatchObject({
    bodyText: "1回目は本番通り2時間で解く",
    completionHtml: '<ul data-type="taskList"><li data-checked="false">未知語ゼロ</li></ul>',
    memoHtml: '<p><a href="https://example.com">参考リンク</a></p>',
  });

  await expect(
    t.mutation(api.mutations.methods.updateMethod.updateMethod, {
      bodyText: "",
      completionHtml: "",
      memoHtml: "",
      methodId,
      name: "  ",
    }),
  ).rejects.toThrow();
});

test("いま見るは所有者ごとに1件だけ(別の方法に立てると前の印が消える)", async () => {
  const t = owner();
  const laneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const firstId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "公式問題集の3回法",
  });
  const secondId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "金フレ高速回転",
  });

  await t.mutation(api.mutations.methods.setNowViewing.setNowViewing, {
    methodId: firstId,
    nowViewing: true,
  });
  let catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.methods.filter((method) => method.nowViewing).map((m) => m._id)).toEqual([
    firstId,
  ]);

  await t.mutation(api.mutations.methods.setNowViewing.setNowViewing, {
    methodId: secondId,
    nowViewing: true,
  });
  catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.methods.filter((method) => method.nowViewing).map((m) => m._id)).toEqual([
    secondId,
  ]);

  await t.mutation(api.mutations.methods.setNowViewing.setNowViewing, {
    methodId: secondId,
    nowViewing: false,
  });
  catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.methods.some((method) => method.nowViewing)).toBe(false);
});

test("参照専用: カタログ操作は日・記録・プリセットに何も起こさない", async () => {
  const t = owner();
  const laneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const methodId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "公式問題集の3回法",
  });
  await t.mutation(api.mutations.methods.setNowViewing.setNowViewing, {
    methodId,
    nowViewing: true,
  });

  const dayPage = await t.query(api.queries.days.get.get, { dateJst: TODAY, todayJst: TODAY });
  expect(dayPage.day).toBeNull();
  expect(dayPage.rows).toEqual([]);
  expect(await t.query(api.queries.presets.list.list, {})).toEqual([]);
});

test("方法をドラッグで並べ替え・レーン間移動できる", async () => {
  const t = owner();
  const examLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const wordLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "単語レーン",
  });
  const firstId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId: examLaneId,
    name: "公式問題集の3回法",
  });
  const secondId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId: examLaneId,
    name: "全文精読",
  });

  await t.mutation(api.mutations.methods.applyMethodOrder.applyMethodOrder, {
    updates: [{ laneId: examLaneId, orderedMethodIds: [secondId, firstId] }],
  });
  let catalog = await t.query(api.queries.methods.list.list, {});
  expect(
    catalog.methods.map((method) => ({ _id: method._id, sortOrder: method.sortOrder })),
  ).toEqual([
    { _id: secondId, sortOrder: 0 },
    { _id: firstId, sortOrder: 1 },
  ]);

  await t.mutation(api.mutations.methods.applyMethodOrder.applyMethodOrder, {
    updates: [
      { laneId: examLaneId, orderedMethodIds: [secondId] },
      { laneId: wordLaneId, orderedMethodIds: [firstId] },
    ],
  });
  catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.methods.find((method) => method._id === firstId)?.laneId).toBe(wordLaneId);

  await expect(
    t.mutation(api.mutations.methods.applyMethodOrder.applyMethodOrder, {
      updates: [{ laneId: examLaneId, orderedMethodIds: [] }],
    }),
  ).rejects.toThrow();
});

test("レーン(列)自体をドラッグで並べ替えられる。全量指定でないと拒否する", async () => {
  const t = owner();
  const examLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const wordLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "単語レーン",
  });
  const readingLaneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "多読レーン",
  });

  await t.mutation(api.mutations.methods.applyLaneOrder.applyLaneOrder, {
    orderedLaneIds: [readingLaneId, examLaneId, wordLaneId],
  });
  const catalog = await t.query(api.queries.methods.list.list, {});
  expect(catalog.lanes).toEqual([
    { _id: readingLaneId, name: "多読レーン", sortOrder: 0 },
    { _id: examLaneId, name: "模試レーン", sortOrder: 1 },
    { _id: wordLaneId, name: "単語レーン", sortOrder: 2 },
  ]);

  await expect(
    t.mutation(api.mutations.methods.applyLaneOrder.applyLaneOrder, {
      orderedLaneIds: [examLaneId],
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.methods.applyLaneOrder.applyLaneOrder, {
      orderedLaneIds: [examLaneId, examLaneId, wordLaneId],
    }),
  ).rejects.toThrow();
});

test("他人のレーンを含む並べ替えは拒否される", async () => {
  const shared = raw();
  const asOwner = shared.withIdentity(OWNER);
  const asOther = shared.withIdentity(OTHER_OWNER);

  const ownersLaneId = await asOwner.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const othersLaneId = await asOther.mutation(api.mutations.methods.createLane.createLane, {
    name: "よそのレーン",
  });

  await expect(
    asOwner.mutation(api.mutations.methods.applyLaneOrder.applyLaneOrder, {
      orderedLaneIds: [othersLaneId],
    }),
  ).rejects.toThrow();

  const catalog = await asOwner.query(api.queries.methods.list.list, {});
  expect(catalog.lanes).toEqual([{ _id: ownersLaneId, name: "模試レーン", sortOrder: 0 }]);
});

test("方法が残っているレーンは消せない。空にすれば消せる", async () => {
  const t = owner();
  const laneId = await t.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const methodId = await t.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "公式問題集の3回法",
  });

  await expect(
    t.mutation(api.mutations.methods.removeLane.removeLane, { laneId }),
  ).rejects.toThrow();

  await t.mutation(api.mutations.methods.removeMethod.removeMethod, { methodId });
  await t.mutation(api.mutations.methods.removeLane.removeLane, { laneId });
  expect(await t.query(api.queries.methods.list.list, {})).toEqual({ lanes: [], methods: [] });
});

test("他人のレーン・方法には触れない(一覧にも出ない)", async () => {
  const shared = raw();
  const asOwner = shared.withIdentity(OWNER);
  const asOther = shared.withIdentity(OTHER_OWNER);

  const laneId = await asOwner.mutation(api.mutations.methods.createLane.createLane, {
    name: "模試レーン",
  });
  const methodId = await asOwner.mutation(api.mutations.methods.createMethod.createMethod, {
    laneId,
    name: "公式問題集の3回法",
  });

  expect(await asOther.query(api.queries.methods.list.list, {})).toEqual({
    lanes: [],
    methods: [],
  });
  await expect(
    asOther.mutation(api.mutations.methods.createMethod.createMethod, {
      laneId,
      name: "乗っ取り",
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.methods.renameLane.renameLane, { laneId, name: "乗っ取り" }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.methods.updateMethod.updateMethod, {
      bodyText: "",
      completionHtml: "",
      memoHtml: "",
      methodId,
      name: "乗っ取り",
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.methods.setNowViewing.setNowViewing, {
      methodId,
      nowViewing: true,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.methods.removeMethod.removeMethod, { methodId }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.methods.removeLane.removeLane, { laneId }),
  ).rejects.toThrow();

  const catalog = await asOwner.query(api.queries.methods.list.list, {});
  expect(catalog.lanes).toHaveLength(1);
  expect(catalog.methods).toHaveLength(1);
});
