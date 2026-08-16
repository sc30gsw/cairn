import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import { validateConcreteAction } from "~domain/concreteActionCore";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

const SHORT = "短い";
const VALID = "アプリを開いて単語カードを10枚めくる";

test("ConcreteActionSchema は8文字未満を拒否する", () => {
  const result = v.safeParse(ConcreteActionSchema, SHORT);
  expect(result.success).toBe(false);
});

test("ConcreteActionSchema は8文字以上を通す", () => {
  const result = v.safeParse(ConcreteActionSchema, VALID);
  expect(result.success).toBe(true);
});

test("Valibot と validateConcreteAction は同じ判定になる", () => {
  for (const value of [SHORT, VALID, "  abc  ", "Unit 3 の例文を声に出して5文読む"]) {
    const parsed = v.safeParse(ConcreteActionSchema, value);
    const serverMessage = validateConcreteAction(value);
    expect(parsed.success).toBe(serverMessage === null);
  }
});
