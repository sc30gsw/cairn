import { expect, test } from "vite-plus/test";

import { assertConcreteAction, assertConcreteActionLines } from "./concreteAction";

test("assertConcreteAction は空文字で throw する", () => {
  expect(() => assertConcreteAction("")).toThrow();
  expect(() => assertConcreteAction("   ")).toThrow();
});

test("assertConcreteAction は1文字以上なら throw しない", () => {
  expect(() => assertConcreteAction("短い")).not.toThrow();
});

test("assertConcreteActionLines は各行を検証する", () => {
  expect(() =>
    assertConcreteActionLines([{ content: "アプリを開いて単語カードを10枚めくる" }]),
  ).not.toThrow();
  expect(() => assertConcreteActionLines([{ content: "" }])).toThrow();
});
