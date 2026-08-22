import { useForm } from "@formisch/react";
import { renderHook } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { validateConfirmRow } from "~/features/today/lib/validate-confirm-row";
import { RowEditorSchema } from "~/lib/validation/row-editor-schema";

test("validateConfirmRow は空のひとことでも値を返す", async () => {
  const { result } = renderHook(() =>
    useForm({
      initialInput: { content: "", minutes: 20 },
      schema: RowEditorSchema,
    }),
  );

  const output = await validateConfirmRow(result.current);
  expect(output).toEqual({ content: "", minutes: 20 });
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

test("validateConfirmRow は有効なひとことを返す", async () => {
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
