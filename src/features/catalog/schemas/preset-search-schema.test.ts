import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { PresetSearchSchema } from "~/features/catalog/schemas/preset-search-schema";

test("URL の weekday 文字列を 0〜6 の整数にする", () => {
  expect(v.parse(PresetSearchSchema, { weekday: "1" })).toEqual({ weekday: 1 });
  expect(v.parse(PresetSearchSchema, { weekday: 0 })).toEqual({ weekday: 0 });
  expect(v.parse(PresetSearchSchema, {})).toEqual({});
});

test("範囲外の weekday は受けない", () => {
  expect(() => v.parse(PresetSearchSchema, { weekday: "7" })).toThrow();
  expect(() => v.parse(PresetSearchSchema, { weekday: "mon" })).toThrow();
  expect(() => v.parse(PresetSearchSchema, { weekday: "" })).toThrow();
});
