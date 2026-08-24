import { expect, test } from "vite-plus/test";

import { eveningHourOptions, hourOptions } from "~/features/my-page/lib/hour-options";

test("夜の催促の時刻は18〜23時の6件", () => {
  const options = eveningHourOptions();

  expect(options).toHaveLength(6);
  expect(options[0]).toEqual({ label: "18時", value: "18" });
  expect(options.at(-1)).toEqual({ label: "23時", value: "23" });
});

test("min === max なら1件だけ返す", () => {
  expect(hourOptions(21, 21)).toEqual([{ label: "21時", value: "21" }]);
});
