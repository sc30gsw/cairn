import { useForm } from "@formisch/react";
import { renderHook } from "@testing-library/react";
import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { validateConfirmRow } from "~/features/today/lib/validate-confirm-row";
import { ConfirmRowSchema, RowEditorSchema } from "~/features/today/schemas/row-editor-schema";

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

test("validateConfirmRow は8文字未満で null を返す", async () => {
  const { result } = renderHook(() =>
    useForm({
      initialInput: { content: "短い", minutes: 20 },
      schema: RowEditorSchema,
    }),
  );

  const output = await validateConfirmRow(result.current);
  expect(output).toBeNull();
});

test("validateConfirmRow は Formisch 検証失敗時 null を返す", async () => {
  const { result } = renderHook(() =>
    useForm({
      initialInput: { content: "アプリを開いて単語カードを10枚めくる", minutes: -1 },
      schema: RowEditorSchema,
    }),
  );

  const output = await validateConfirmRow(result.current);
  expect(output).toBeNull();
});

test("validateConfirmRow は有効な具体的手順を返す", async () => {
  const { result } = renderHook(() =>
    useForm({
      initialInput: { content: "アプリを開いて単語カードを10枚めくる", minutes: 20 },
      schema: RowEditorSchema,
    }),
  );

  const output = await validateConfirmRow(result.current);
  expect(output).toEqual({
    content: "アプリを開いて単語カードを10枚めくる",
    minutes: 20,
  });
});
