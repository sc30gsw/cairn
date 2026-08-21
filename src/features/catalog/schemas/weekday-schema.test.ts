import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { CreatePresetSchema } from "~/features/catalog/schemas/preset-schema";
import { WeekdaySchema, weekdayFromSelect } from "~/features/catalog/schemas/weekday-schema";
import { presetWeekdayHash } from "~/lib/preset-weekday-hash";

test("フォームの曜日も URL と同じ 0〜6 だけ通す", () => {
  expect(v.parse(WeekdaySchema, 1)).toBe(1);
  expect(() => v.parse(WeekdaySchema, 7)).toThrow();
  expect(v.parse(CreatePresetSchema, { name: "月", weekday: 1 })).toEqual({
    name: "月",
    weekday: 1,
  });
  expect(() => v.parse(CreatePresetSchema, { name: "月" })).toThrow();
});

test("Select の文字列は同じスキーマで曜日にする", () => {
  expect(weekdayFromSelect("1")).toBe(1);
  expect(weekdayFromSelect("7")).toBeUndefined();
  expect(weekdayFromSelect("mon")).toBeUndefined();
});

test("深リンクの hash は曜日のアンカーと一致する", () => {
  expect(presetWeekdayHash(1)).toBe("preset-weekday-1");
});
