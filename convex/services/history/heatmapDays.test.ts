import { expect, test } from "vite-plus/test";

import type { Doc } from "../../_generated/dataModel";
import { buildMemoByDate } from "./heatmapDays";

function dayDoc(dateJst: string, overrides: Partial<Doc<"days">> = {}): Doc<"days"> {
  return {
    _creationTime: 1,
    _id: "days:1" as Doc<"days">["_id"],
    dateJst,
    deletedAt: undefined,
    ownerId: "owner",
    ...overrides,
  } as Doc<"days">;
}

test("buildMemoByDate は空白のみのメモを null にする", () => {
  expect(
    buildMemoByDate([
      dayDoc("2026-08-17", { memo: "  \n  " }),
      dayDoc("2026-08-18", { memo: "  記録  " }),
    ]),
  ).toEqual({
    "2026-08-17": null,
    "2026-08-18": "記録",
  });
});

test("buildMemoByDate は削除済み日を除外する", () => {
  expect(
    buildMemoByDate([
      dayDoc("2026-08-17", { deletedAt: 1, memo: "削除済み" }),
      dayDoc("2026-08-17", { _creationTime: 2, _id: "days:2" as Doc<"days">["_id"], memo: "有効" }),
    ]),
  ).toEqual({
    "2026-08-17": "有効",
  });
});

test("buildMemoByDate は同一日の複数行から最古の live 行を選ぶ", () => {
  expect(
    buildMemoByDate([
      dayDoc("2026-08-17", {
        _creationTime: 10,
        _id: "days:new" as Doc<"days">["_id"],
        memo: "新しい",
      }),
      dayDoc("2026-08-17", {
        _creationTime: 1,
        _id: "days:old" as Doc<"days">["_id"],
        memo: "最古",
      }),
    ]),
  ).toEqual({
    "2026-08-17": "最古",
  });
});
