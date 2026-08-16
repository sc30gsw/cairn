import { setErrors, validate, type FormStore } from "@formisch/react";
import * as v from "valibot";
import { CONCRETE_ACTION_VALIDATION_MESSAGE } from "~domain/concreteActionCore";

import { ConfirmRowSchema, type RowEditorSchema } from "~/features/today/schemas/row-editor-schema";

export async function validateConfirmRow(form: FormStore<typeof RowEditorSchema>) {
  const result = await validate(form);
  if (!result.success) {
    return null;
  }
  const confirmed = v.safeParse(ConfirmRowSchema, result.output);
  if (!confirmed.success) {
    const message = confirmed.issues[0]?.message ?? CONCRETE_ACTION_VALIDATION_MESSAGE;
    setErrors(form, { path: ["content"], errors: [message] });
    return null;
  }
  return confirmed.output;
}
