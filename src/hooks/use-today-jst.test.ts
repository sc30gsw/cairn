import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

//? モジュールスコープの単一ストアを持つため、テストごとに vi.resetModules() で作り直す。
//? 動的 import は vi.setSystemTime 後に行い、初期値(モジュール初期化時の todayJst())を固定する。
beforeEach(() => {
  vi.useFakeTimers();
});

//? useTodayJst は内部で useSyncExternalStore を呼ぶ。unmount せずに残すとモジュールスコープの
//? 単一ストアに document/window の visibilitychange/focus リスナーが残ったままになる
//? (renderWithMantine を使わないため自動 cleanup が登録されない — .claude/rules/common/testing.md 参照)。
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetModules();
});

test("JST 23:59:50 から 0:00 をまたぐと今日の値が変わる", async () => {
  //? 23:59:50 JST = 14:59:50 UTC
  vi.setSystemTime(new Date("2026-08-24T14:59:50.000Z"));
  const { useTodayJst } = await import("~/hooks/use-today-jst");

  const { result } = renderHook(() => useTodayJst());
  expect(result.current).toBe("2026-08-24");

  act(() => {
    //? 0:00:05 JST まで進める(マージン込みの発火を確実に踏む)
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
    //? スリープ復帰などタイマー発火より先に日付が進んだ状況を想定し、タイマーは進めずに focus だけ発火する
    vi.setSystemTime(new Date("2026-08-25T00:10:00.000Z"));
    window.dispatchEvent(new Event("focus"));
  });

  expect(result.current).toBe("2026-08-25");
});
