import { act } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { TIMER_MAX_SEGMENT_MS } from "~domain/rowTimer";

import { RowTimerChip } from "~/features/board/components/row-timer-chip";
import type { BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const NOW = 1_800_000_000_000;

function row(timer: BoardRow["timer"]): BoardRow {
  return {
    _id: "r1" as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: "金のフレーズ",
    minutes: 30,
    sortOrder: 0,
    status: "進行中",
    timer,
  };
}

const noop = () => undefined;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

test("計測中は1秒後に時計が進む", () => {
  const { getByText } = renderWithMantine(
    <RowTimerChip
      onConfirm={noop}
      onResume={noop}
      onStop={noop}
      row={row({ accumulatedMs: 0, autoStoppedAt: null, startedAt: NOW })}
    />,
  );

  expect(getByText("00:00")).toBeDefined();

  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(getByText("00:01")).toBeDefined();
});

test("一時停止は時間が経っても進まない", () => {
  const { getByText } = renderWithMantine(
    <RowTimerChip
      onConfirm={noop}
      onResume={noop}
      onStop={noop}
      row={row({ accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null })}
    />,
  );

  expect(getByText("12:34")).toBeDefined();

  act(() => {
    vi.advanceTimersByTime(5000);
  });

  expect(getByText("12:34")).toBeDefined();
});

test("計測を止めるボタンは onStop を呼ぶ", () => {
  const onStop = vi.fn();
  const { getByRole } = renderWithMantine(
    <RowTimerChip
      onConfirm={noop}
      onResume={noop}
      onStop={onStop}
      row={row({ accumulatedMs: 0, autoStoppedAt: null, startedAt: NOW })}
    />,
  );

  getByRole("button", { name: "計測を止める" }).click();

  expect(onStop).toHaveBeenCalledTimes(1);
});

test("計測が無い進行中の行は「計測をはじめる」で onResume を呼ぶ", () => {
  const onResume = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <RowTimerChip onConfirm={noop} onResume={onResume} onStop={noop} row={row(null)} />,
  );

  expect(getByText("計測をはじめる")).toBeDefined();
  getByRole("button", { name: "計測をはじめる" }).click();

  expect(onResume).toHaveBeenCalledTimes(1);
});

test("自動停止した行は警告と240分を出す", () => {
  const { getByText } = renderWithMantine(
    <RowTimerChip
      onConfirm={noop}
      onResume={noop}
      onStop={noop}
      row={row({ accumulatedMs: TIMER_MAX_SEGMENT_MS, autoStoppedAt: NOW, startedAt: null })}
    />,
  );

  expect(getByText("4:00:00")).toBeDefined();
  expect(getByText(/240分で自動停止しました/)).toBeDefined();
});

test("確定ボタンは onConfirm を呼ぶ", () => {
  const onConfirm = vi.fn();
  const { getByRole } = renderWithMantine(
    <RowTimerChip
      onConfirm={onConfirm}
      onResume={noop}
      onStop={noop}
      row={row({ accumulatedMs: 60_000, autoStoppedAt: null, startedAt: null })}
    />,
  );

  getByRole("button", { name: "確定" }).click();

  expect(onConfirm).toHaveBeenCalledTimes(1);
});
