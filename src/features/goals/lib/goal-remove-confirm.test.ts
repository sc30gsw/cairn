import { expect, test } from "vite-plus/test";

import { removeConfirmCopy } from "~/features/goals/lib/goal-remove-confirm";

test("子が0件なら単純形になり、戻せないことを書く", () => {
  const copy = removeConfirmCopy({
    achievedChildCount: 0,
    childNames: [],
    goalName: "音読を毎日続けられる",
    variant: "longTerm",
  });

  expect(copy.title).toBe("長期目標を削除しますか？");
  expect(copy.labelConfirm).toBe("削除する");
  expect(copy.children).toContain("音読を毎日続けられる");
  expect(copy.children).toContain("削除するとゴミ箱には入らず、戻せません。");
});

test("子が3件なら全部を列挙し、まとめて削除の語になる", () => {
  const copy = removeConfirmCopy({
    achievedChildCount: 0,
    childNames: [
      "Chapter 1-3 を暗唱できる（期限 2026-09-07）",
      "Chapter 4-6 を暗唱できる（期限 2026-09-21）",
      "Chapter 7-9 を暗唱できる（期限 2026-10-05）",
    ],
    goalName: "Distinction の例文を口頭で言い切る",
    variant: "longTerm",
  });

  expect(copy.labelConfirm).toBe("まとめて削除する");
  expect(copy.children).toContain("ひもづくチェックポイント 3件");
  expect(copy.children).toContain("・Chapter 7-9 を暗唱できる（期限 2026-10-05）");
  expect(copy.children).not.toContain("ほか");
});

test("子が5件なら3件だけ列挙して残りを件数で足す", () => {
  const copy = removeConfirmCopy({
    achievedChildCount: 0,
    childNames: ["子1", "子2", "子3", "子4", "子5"],
    goalName: "長期目標",
    variant: "longTerm",
  });

  expect(copy.children).toContain("・子3");
  expect(copy.children).not.toContain("・子4");
  expect(copy.children).toContain("ほか 2件");
});

test("達成済みの内訳を必ず出す", () => {
  const copy = removeConfirmCopy({
    achievedChildCount: 1,
    childNames: ["子1", "子2", "子3"],
    goalName: "長期目標",
    variant: "longTerm",
  });

  expect(copy.children).toContain("ひもづくチェックポイント 3件（うち達成済み 1件）");
});

test("本番目標とチェックポイントはタイトルが変わる", () => {
  const input = { achievedChildCount: 0, childNames: [], goalName: "目標" };
  expect(removeConfirmCopy({ ...input, variant: "exam" }).title).toBe("本番目標を削除しますか？");
  expect(removeConfirmCopy({ ...input, variant: "checkpoint" }).title).toBe(
    "チェックポイントを削除しますか？",
  );
});
