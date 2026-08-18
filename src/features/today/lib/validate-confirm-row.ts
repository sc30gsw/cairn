import { validate, type FormStore } from "@formisch/react";

import type { RowEditorSchema } from "~/features/today/schemas/row-editor-schema";

export async function validateConfirmRow(form: FormStore<typeof RowEditorSchema>) {
  const result = await validate(form);
  if (!result.success) {
    return null;
  }
  return result.output;
}
