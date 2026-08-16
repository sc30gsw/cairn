import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

test("ConcreteActionSchema は8文字未満を拒否する", () => {
  const result = v.safeParse(ConcreteActionSchema, "短い");
  expect(result.success).toBe(false);
});

test("ConcreteActionSchema は8文字以上を通す", () => {
  const result = v.safeParse(ConcreteActionSchema, "アプリを開いて単語カードを10枚めくる");
  expect(result.success).toBe(true);
});
