import { expect, test } from "vite-plus/test";

import { assertConcreteAction, assertConcreteActionLines } from "./concreteAction";

test("assertConcreteAction は短い文字列で throw する", () => {
  expect(() => assertConcreteAction("短い")).toThrow();
});

test("assertConcreteActionLines は各行を検証する", () => {
  expect(() =>
    assertConcreteActionLines([{ content: "アプリを開いて単語カードを10枚めくる" }]),
  ).not.toThrow();
  expect(() => assertConcreteActionLines([{ content: "短い" }])).toThrow();
});
