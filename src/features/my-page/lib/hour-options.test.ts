import { expect, test } from "vite-plus/test";

import {
  eveningHourOptions,
  hourOptions,
  quietHourOptions,
} from "~/features/my-page/lib/hour-options";

test("夜の催促の時刻は18〜23時の6件", () => {
  const options = eveningHourOptions();

  expect(options).toHaveLength(6);
  expect(options[0]).toEqual({ label: "18時", value: "18" });
  expect(options.at(-1)).toEqual({ label: "23時", value: "23" });
});

test("静穏時間の時刻は0〜23時の24件", () => {
  const options = quietHourOptions();

  expect(options).toHaveLength(24);
  expect(options[0]).toEqual({ label: "0時", value: "0" });
  expect(options.at(-1)).toEqual({ label: "23時", value: "23" });
});

test("min === max なら1件だけ返す", () => {
  expect(hourOptions(21, 21)).toEqual([{ label: "21時", value: "21" }]);
});
