import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { SEARCH_QUERY_TOO_SHORT_MESSAGE, SEARCH_RESULT_LIMIT } from "./lib/domain";
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
const OTHER = { email: "other@example.com", subject: "other-subject" };

function harness() {
  return convexTest(schema, modules);
}

type Harness = ReturnType<typeof harness>;

type RowSeed = {
  content: string;
  deletedAt?: number;
  minutes?: number;
  sortOrder?: number;
};

type DaySeed = {
  dateJst: string;
  deletedAt?: number;
  memo?: string;
  rows?: RowSeed[];
};

//? 検索は読み取りだけなので、フィクスチャは t.run で直接入れる（ownerId は identity.subject）
async function seed(t: Harness, ownerId: string, days: DaySeed[], itemName = "金のフレーズ") {
  await t.run(async (ctx) => {
    const itemId = await ctx.db.insert("items", { name: itemName, ownerId, sortOrder: 0 });
    for (const day of days) {
      const dayId = await ctx.db.insert("days", {
        dateJst: day.dateJst,
        deletedAt: day.deletedAt,
        memo: day.memo,
        ownerId,
      });
      for (const [index, row] of (day.rows ?? []).entries()) {
        await ctx.db.insert("rows", {
          content: row.content,
          dateJst: day.dateJst,
          dayId,
          deletedAt: row.deletedAt,
          itemId,
          minutes: row.minutes ?? 30,
          ownerId,
          sortOrder: row.sortOrder ?? index,
          status: "確定",
        });
      }
    }
  });
}

function search(t: Harness, query: string, fromJst?: string) {
  return t.withIdentity(OWNER).query(api.queries.history.search.search, { fromJst, query });
}

test("ひとことと日のメモを部分一致で探し、日付降順（同日はメモが先、あとは行順）に並べる", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [
    {
      dateJst: "2026-08-15",
      memo: "朝の音読が続いている",
      rows: [
        { content: "金フレの音読を30分", sortOrder: 1 },
        { content: "シャドーイング", sortOrder: 0 },
        { content: "Unit 3 の音読", sortOrder: 2 },
      ],
    },
    { dateJst: "2026-08-16", rows: [{ content: "夜に音読 Unit 4", minutes: 15 }] },
  ]);

  const result = await search(t, "音読");

  expect(result.truncated).toBe(false);
  expect(result.hits.map((hit) => [hit.dateJst, hit.kind, hit.text])).toEqual([
    ["2026-08-16", "hitokoto", "夜に音読 Unit 4"],
    ["2026-08-15", "memo", "朝の音読が続いている"],
    ["2026-08-15", "hitokoto", "金フレの音読を30分"],
    ["2026-08-15", "hitokoto", "Unit 3 の音読"],
  ]);
  expect(result.hits[0]).toMatchObject({
    category: "不明",
    minutes: 15,
    rowId: expect.any(String),
    title: "金のフレーズ",
  });
  expect(result.hits[1]).toEqual({
    dateJst: "2026-08-15",
    kind: "memo",
    text: "朝の音読が続いている",
    title: "メモ",
  });
});

test("他の所有者の記録は出ない", async () => {
  const t = harness();
  await seed(t, OTHER.subject, [{ dateJst: "2026-08-15", rows: [{ content: "他人の音読" }] }]);
  await seed(t, OWNER.subject, [{ dateJst: "2026-08-15", rows: [{ content: "自分の音読" }] }]);

  const result = await search(t, "音読");

  expect(result.hits.map((hit) => hit.text)).toEqual(["自分の音読"]);
});

test("ゴミ箱の記録と、ゴミ箱の日に属する記録・メモは出ない", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [
    {
      dateJst: "2026-08-15",
      rows: [{ content: "消した音読", deletedAt: 1 }, { content: "残った音読" }],
    },
    {
      dateJst: "2026-08-14",
      deletedAt: 1,
      memo: "消した日の音読メモ",
      rows: [{ content: "消した日の音読" }],
    },
  ]);

  const result = await search(t, "音読");

  expect(result.hits.map((hit) => hit.text)).toEqual(["残った音読"]);
});

test("全角・半角・大文字小文字の違いを越えて当たる", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [
    {
      dateJst: "2026-08-15",
      rows: [{ content: "TOEIC Part５ を10問" }, { content: "toeic 模試" }],
    },
  ]);

  expect((await search(t, "part5")).hits.map((hit) => hit.text)).toEqual(["TOEIC Part５ を10問"]);
  expect((await search(t, "ＴＯＥＩＣ")).hits).toHaveLength(2);
});

test("2文字未満の検索語はドメインの文言で拒否する", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [{ dateJst: "2026-08-15", rows: [{ content: "音読" }] }]);

  await expect(search(t, "音")).rejects.toThrow(SEARCH_QUERY_TOO_SHORT_MESSAGE);
  await expect(search(t, " 　")).rejects.toThrow(SEARCH_QUERY_TOO_SHORT_MESSAGE);
});

test("fromJst を渡すとそれより前の日は探さない。省略なら全期間", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [
    { dateJst: "2025-08-31", rows: [{ content: "去年の音読" }] },
    { dateJst: "2025-09-01", rows: [{ content: "下限の日の音読" }] },
    { dateJst: "2026-08-15", rows: [{ content: "今年の音読" }] },
  ]);

  expect((await search(t, "音読", "2025-09-01")).hits.map((hit) => hit.text)).toEqual([
    "今年の音読",
    "下限の日の音読",
  ]);
  expect((await search(t, "音読")).hits).toHaveLength(3);
  await expect(search(t, "音読", "2025/09/01")).rejects.toThrow();
});

test("上限を超えたら新しい順に上限件数だけ返し truncated を立てる", async () => {
  const t = harness();
  const rows: RowSeed[] = Array.from({ length: SEARCH_RESULT_LIMIT + 2 }, (_, index) => ({
    content: `音読 ${String(index)}`,
    sortOrder: index,
  }));
  await seed(t, OWNER.subject, [{ dateJst: "2026-08-15", rows }]);

  const result = await search(t, "音読");

  expect(result.hits).toHaveLength(SEARCH_RESULT_LIMIT);
  expect(result.truncated).toBe(true);
  expect(result.hits[0]?.text).toBe("音読 0");
});

test("メモだけの日も探せる", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [{ dateJst: "2026-08-15", memo: "音読を朝に回す" }]);

  const result = await search(t, "朝に");

  expect(result.hits).toHaveLength(1);
  expect(result.hits[0]?.kind).toBe("memo");
  expect(result.hits[0]?.rowId).toBeUndefined();
});

test("rowId は実在する記録を指す", async () => {
  const t = harness();
  await seed(t, OWNER.subject, [{ dateJst: "2026-08-15", rows: [{ content: "音読" }] }]);

  const result = await search(t, "音読");
  const rowId = result.hits[0]?.rowId as Id<"rows">;
  const row = await t.run((ctx) => ctx.db.get("rows", rowId));

  expect(row?.content).toBe("音読");
});
