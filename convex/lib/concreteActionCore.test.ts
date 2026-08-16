import { expect, test } from "vite-plus/test";

import {
  CONCRETE_ACTION_MIN_LENGTH,
  concreteActionPlaceholder,
  validateConcreteAction,
} from "./concreteActionCore";

test("空文字・空白のみは具体的手順として拒否する", () => {
  expect(validateConcreteAction("")).toBe("具体的手順を入力してください");
  expect(validateConcreteAction("   ")).toBe("具体的手順を入力してください");
});

test("1文字以上の具体的手順は通す", () => {
  expect(validateConcreteAction("Unit 1")).toBeNull();
  expect(validateConcreteAction("x")).toBeNull();
  expect(validateConcreteAction("アプリを開いて単語カードを10枚めくる")).toBeNull();
  expect(validateConcreteAction("  Unit 3 の例文を声に出して5文読む  ")).toBeNull();
});

test("最小文字数定数は1", () => {
  expect(CONCRETE_ACTION_MIN_LENGTH).toBe(1);
});

test("項目名から placeholder 例を返す", () => {
  expect(concreteActionPlaceholder("金のフレーズ")).toContain("Unit");
  expect(concreteActionPlaceholder("未知の項目")).toContain("最初の一歩");
});
