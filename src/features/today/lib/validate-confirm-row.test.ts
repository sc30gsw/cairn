import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { ConfirmRowSchema } from "~/features/today/schemas/row-editor-schema";

test("確定用スキーマは8文字未満の具体的手順を拒否する", () => {
  const result = v.safeParse(ConfirmRowSchema, { content: "短い", minutes: 20 });
  expect(result.success).toBe(false);
});

test("確定用スキーマは8文字以上の具体的手順を通す", () => {
  const result = v.safeParse(ConfirmRowSchema, {
    content: "アプリを開いて単語カードを10枚めくる",
    minutes: 20,
  });
  expect(result.success).toBe(true);
});
