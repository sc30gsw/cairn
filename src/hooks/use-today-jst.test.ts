import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetModules();
});

test("JST 23:59:50 から 0:00 をまたぐと今日の値が変わる", async () => {
  vi.setSystemTime(new Date("2026-08-24T14:59:50.000Z"));
  const { useTodayJst } = await import("~/hooks/use-today-jst");

  const { result } = renderHook(() => useTodayJst());
  expect(result.current).toBe("2026-08-24");

  act(() => {
    vi.setSystemTime(new Date("2026-08-24T15:00:05.000Z"));
    vi.advanceTimersByTime(15_000);
  });

  expect(result.current).toBe("2026-08-25");
});

test("日付が変わらないうちは値を保つ", async () => {
  vi.setSystemTime(new Date("2026-08-24T03:00:00.000Z"));
  const { useTodayJst } = await import("~/hooks/use-today-jst");

  const { result } = renderHook(() => useTodayJst());
  expect(result.current).toBe("2026-08-24");

  act(() => {
    vi.advanceTimersByTime(60_000);
  });

  expect(result.current).toBe("2026-08-24");
});

test("focus イベントで日付をまたいでいれば再計算される", async () => {
  vi.setSystemTime(new Date("2026-08-24T14:59:50.000Z"));
  const { useTodayJst } = await import("~/hooks/use-today-jst");

  const { result } = renderHook(() => useTodayJst());
  expect(result.current).toBe("2026-08-24");

  act(() => {
    vi.setSystemTime(new Date("2026-08-25T00:10:00.000Z"));
    window.dispatchEvent(new Event("focus"));
  });

  expect(result.current).toBe("2026-08-25");
});
