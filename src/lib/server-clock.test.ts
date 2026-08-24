import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import {
  readOffsetMs,
  recordServerInstant,
  SERVER_CLOCK_OFFSET_KEY,
  serverNowMs,
} from "~/lib/server-clock";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

test("オフセット未測定なら端末時刻をそのまま使う", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);

  expect(readOffsetMs()).toBe(0);
  expect(serverNowMs()).toBe(1_000_000);
});

test("サーバのほうが未来ならオフセットを引き上げて表示に反映する", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);

  recordServerInstant(1_300_000, 1_000_000);

  expect(readOffsetMs()).toBe(300_000);
  expect(serverNowMs()).toBe(1_300_000);
});

test("下限補正なので既存オフセットを下げない", () => {
  recordServerInstant(1_300_000, 1_000_000);
  recordServerInstant(1_100_000, 1_000_000);

  expect(readOffsetMs()).toBe(300_000);
});

test("壊れた保存値と常識外れのオフセットは0に落ちる", () => {
  localStorage.setItem(SERVER_CLOCK_OFFSET_KEY, "ぜんぜん数値じゃない");
  expect(readOffsetMs()).toBe(0);

  localStorage.setItem(SERVER_CLOCK_OFFSET_KEY, String(48 * 60 * 60 * 1000));
  expect(readOffsetMs()).toBe(0);

  localStorage.clear();
  recordServerInstant(48 * 60 * 60 * 1000, 0);
  expect(readOffsetMs()).toBe(0);
});
