import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import { validateConcreteAction } from "~domain/concreteActionCore";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

const EMPTY = "";
const BLANK = "   ";
const VALID = "アプリを開いて単語カードを10枚めくる";

test("ConcreteActionSchema は空文字・空白のみを拒否する", () => {
  expect(v.safeParse(ConcreteActionSchema, EMPTY).success).toBe(false);
  expect(v.safeParse(ConcreteActionSchema, BLANK).success).toBe(false);
});

test("ConcreteActionSchema は1文字以上を通す", () => {
  const result = v.safeParse(ConcreteActionSchema, VALID);
  expect(result.success).toBe(true);
  expect(v.safeParse(ConcreteActionSchema, "短い").success).toBe(true);
});

test("Valibot と validateConcreteAction は同じ判定になる", () => {
  for (const value of [EMPTY, BLANK, VALID, "  abc  ", "Unit 3 の例文を声に出して5文読む"]) {
    const parsed = v.safeParse(ConcreteActionSchema, value);
    const serverMessage = validateConcreteAction(value);
    expect(parsed.success).toBe(serverMessage === null);
  }
});
