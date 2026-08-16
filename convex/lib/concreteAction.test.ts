import { expect, test } from "vite-plus/test";

import {
  assertConcreteAction,
  assertConcreteActionLines,
  CONCRETE_ACTION_MIN_LENGTH,
  concreteActionPlaceholder,
  validateConcreteAction,
} from "./concreteAction";

test("8文字未満は具体的手順として拒否する", () => {
  expect(validateConcreteAction("Unit 1")).toBe(
    "具体的手順は8文字以上で、最初の一歩を書いてください",
  );
  expect(validateConcreteAction("   abc   ")).toBe(
    "具体的手順は8文字以上で、最初の一歩を書いてください",
  );
});

test("8文字以上の具体的手順は通す", () => {
  expect(validateConcreteAction("アプリを開いて単語カードを10枚めくる")).toBeNull();
  expect(validateConcreteAction("  Unit 3 の例文を声に出して5文読む  ")).toBeNull();
});

test("最小文字数定数は8", () => {
  expect(CONCRETE_ACTION_MIN_LENGTH).toBe(8);
});

test("項目名から placeholder 例を返す", () => {
  expect(concreteActionPlaceholder("金のフレーズ")).toContain("Unit");
  expect(concreteActionPlaceholder("未知の項目")).toContain("最初の一歩");
});

test("assertConcreteAction は短い文字列で throw する", () => {
  expect(() => assertConcreteAction("短い")).toThrow();
});

test("assertConcreteActionLines は各行を検証する", () => {
  expect(() =>
    assertConcreteActionLines([{ content: "アプリを開いて単語カードを10枚めくる" }]),
  ).not.toThrow();
  expect(() => assertConcreteActionLines([{ content: "短い" }])).toThrow();
});
