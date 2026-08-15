import { expect, test, vi } from "vite-plus/test";

import { DayBoard } from "~/features/today/components/day-board";
import type { DayPage, DayRow } from "~/features/today/types/day";
import { renderWithMantine } from "~/test-utils/render";

const row = {
  _id: "row1" as DayRow["_id"],
  category: "多聴",
  content: "",
  itemId: "item1" as DayRow["itemId"],
  itemName: "Distinction 2000",
  minutes: 30,
  sortOrder: 0,
  status: "未着手",
} satisfies DayRow;

const day = {
  dateJst: "2026-08-17",
  day: {
    _id: "day1" as NonNullable<DayPage["day"]>["_id"],
    bedHm: null,
    condition: null,
    dateJst: "2026-08-17",
    memo: null,
    sleepHours: null,
    sleepWarning: false,
    wakeHm: null,
  },
  isFuture: false,
  rows: [row],
  shareMarkdown: "",
  tonightBedHm: null,
  volumeMinutes: 0,
} satisfies DayPage;

const items = [{ _id: row.itemId, category: "多聴" as const, name: "Distinction 2000" }];

test("ログイン済みなら今日の未着手行が見える", () => {
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByRole("textbox", { name: /Distinction 2000/ })).toBeDefined();
  expect(getByText("未着手")).toBeDefined();
});

test("確定とスキップが画面上で呼べる", () => {
  const onConfirm = vi.fn();
  const onSkip = vi.fn();
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={onConfirm}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={onSkip}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  getByRole("button", { name: "確定" }).click();
  expect(onConfirm).toHaveBeenCalledWith({
    content: "",
    minutes: 30,
    rowId: row._id,
  });
  expect((getByRole("button", { name: "確定" }) as HTMLButtonElement).type).toBe("submit");
  getByRole("button", { name: "スキップ" }).focus();
  getByRole("button", { name: "スキップ" }).click();
  expect(onSkip).toHaveBeenCalledWith(row._id);
});

test("警告中でも確定はロックされない", () => {
  const warned = {
    ...day,
    day: { ...day.day, sleepHours: 6, sleepWarning: true },
  } satisfies DayPage;
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={warned}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByText("睡眠が7時間未満です。行の確定はできます。")).toBeDefined();
  expect((getByRole("button", { name: "確定" }) as HTMLButtonElement).disabled).toBe(false);
});

test("今夜の就寝に日付ピッカーはない", () => {
  const { getByLabelText, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByLabelText(/今夜の就寝/)).toBeDefined();
  expect(queryByLabelText(/日付/)).toBeNull();
});

test("共有文のコピー操作が見える", () => {
  const withShare = {
    ...day,
    shareMarkdown: "- Distinction 2000: Unit 1 30分",
    volumeMinutes: 30,
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={withShare}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByRole("button", { name: "共有文をコピー" })).toBeDefined();
});

test("今日のプリセット切替が見える。未設定のコンディションは普通にしない", () => {
  const onSaveCondition = vi.fn();
  const { getByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={onSaveCondition}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 }]}
    />,
  );
  expect(getByLabelText("今日のプリセット切替")).toBeDefined();
  expect(getByLabelText("コンディション").textContent).toContain("未設定");
  expect(onSaveCondition).not.toHaveBeenCalled();
});

test("未来の日は行を足せず今夜も出さない", () => {
  const future = { ...day, isFuture: true } satisfies DayPage;
  const { queryByRole, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-20"
      day={future}
      isToday={false}
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(queryByRole("button", { name: "行を足す" })).toBeNull();
  expect(queryByLabelText(/今夜の就寝/)).toBeNull();
});

test("過去の日は起床を出せるが今夜の就寝は出さない", () => {
  const { getByLabelText, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-16"
      day={day}
      isToday={false}
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByLabelText("起床")).toBeDefined();
  expect(queryByLabelText(/今夜の就寝/)).toBeNull();
});

test("その日に行を足せる", () => {
  const { getByRole, getByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
    />,
  );
  expect(getByLabelText(/その日限りの項目/)).toBeDefined();
  expect(getByRole("button", { name: "行を足す" })).toBeDefined();
});
