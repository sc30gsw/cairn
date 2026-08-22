import * as v from "valibot";

export const PASSKEY_DEFAULT_DEVICE_NAME = "Cairn";

export const PasskeyAddSchema = v.object({
  name: v.pipe(
    v.string("デバイス名を入力してください"),
    v.nonEmpty("デバイス名を入力してください"),
    v.maxLength(50, "デバイス名は50文字以内にしてください"),
  ),
});

export type PasskeyAddInput = v.InferOutput<typeof PasskeyAddSchema>;
