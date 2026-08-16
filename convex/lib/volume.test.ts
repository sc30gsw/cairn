import { expect, test } from "vite-plus/test";

import { STATUSES } from "./domain";
import { confirmedVolumeMinutes, type VolumeRow } from "./volume";

const [confirmed, pending, skipped] = STATUSES;

test("学習量は確定行の分数だけ", () => {
  const rows = [
    { minutes: 30, status: confirmed },
    { minutes: 20, status: pending },
    { minutes: 15, status: skipped },
    { minutes: 20, status: confirmed },
  ] as const satisfies readonly VolumeRow[];

  expect(confirmedVolumeMinutes(rows)).toBe(50);
});
