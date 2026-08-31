import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import type { DateJst } from "~domain/jst";

import { useApplyPresetFromSearch } from "~/features/today/hooks/use-apply-preset-from-search";
import type { PresetId } from "~/types/item";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }));

vi.mock("~/features/today/hooks/day-mutations", () => ({
  useSwitchPreset: () => ({ mutateAsync }),
}));

vi.mock("~/features/today/hooks/day-queries", () => ({
  usePresetsList: () => ({ data: [] }),
}));

vi.mock("~/hooks/use-today-jst", () => ({
  useTodayJst: () => "2026-08-17" as DateJst,
}));

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>) => operation(),
}));

afterEach(() => {
  mutateAsync.mockClear();
  cleanup();
});

const DATE_JST = "2026-08-17" as DateJst;

test("preset が指定されていなければ mutation は発火しない", () => {
  const { result } = renderHook(() => useApplyPresetFromSearch(DATE_JST, undefined, true));

  expect(mutateAsync).not.toHaveBeenCalled();
  expect(result.current.selectedPresetId).toBeNull();
});

test("preset が指定されていれば switchPreset を呼ぶ", () => {
  const { result } = renderHook(() =>
    useApplyPresetFromSearch(DATE_JST, "preset-1" as PresetId, true),
  );

  expect(mutateAsync).toHaveBeenCalledWith({
    dateJst: DATE_JST,
    presetId: "preset-1",
    todayJst: "2026-08-17",
  });
  expect(result.current.selectedPresetId).toBe("preset-1");
});

test("isToday が false なら mutation は発火しない", () => {
  const { result } = renderHook(() =>
    useApplyPresetFromSearch(DATE_JST, "preset-1" as PresetId, false),
  );

  expect(mutateAsync).not.toHaveBeenCalled();
  expect(result.current.selectedPresetId).toBe("preset-1");
});

test("preset が空文字(不正な外部入力)なら「指定なし」として扱う", () => {
  const { result } = renderHook(() => useApplyPresetFromSearch(DATE_JST, "" as PresetId, true));

  expect(mutateAsync).not.toHaveBeenCalled();
  expect(result.current.selectedPresetId).toBeNull();
});
