import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { PasskeyAddSchema } from "~/lib/validation/passkey-schema";

test("PasskeyAddSchema は有効なデバイス名を受け付ける", () => {
  expect(v.safeParse(PasskeyAddSchema, { name: "Cairn" }).success).toBe(true);
});

test("PasskeyAddSchema は空のデバイス名を拒否する", () => {
  expect(v.safeParse(PasskeyAddSchema, { name: "" }).success).toBe(false);
});
