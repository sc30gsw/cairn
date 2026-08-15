import { expect, test } from "vite-plus/test";

import { confirmedVolumeMinutes } from "./volume";

test("学習量は確定行の分数だけ", () => {
  expect(
    confirmedVolumeMinutes([
      { minutes: 30, status: "確定" },
      { minutes: 20, status: "未着手" },
      { minutes: 15, status: "スキップ" },
      { minutes: 20, status: "確定" },
    ]),
  ).toBe(50);
});
