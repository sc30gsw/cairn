import { waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { DayBoard } from "~/features/today/components/day-board";
import type { DayPage, DayRow } from "~/features/today/types/day";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const row = {
  _id: "row1" as DayRow["_id"],
  category: "多聴",
  categorySortOrder: 1,
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

const items = [{ _id: row.itemId, categoryId: "c1" as never, name: "Distinction 2000" }];

const idleHandlers = {
  onAddRow: vi.fn(),
  onConfirm: vi.fn(),
  onRemoveDay: vi.fn(),
  onRemoveRow: vi.fn(),
  onSaveBed: vi.fn(),
  onSaveCondition: vi.fn(),
  onSaveMemo: vi.fn(),
  onSaveWake: vi.fn(),
  onSkip: vi.fn(),
  onSwitchPreset: vi.fn(),
};

test("ログイン済みなら今日の未着手の記録が見える", () => {
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByRole("textbox", { name: "Distinction 2000 内容" })).toBeDefined();
  expect(getByText("未着手")).toBeDefined();
});

test("記録を確定スイッチで確定、オフでスキップできる", async () => {
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
      selectedPresetId={null}
    />,
  );
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith({
      content: "",
      minutes: 30,
      rowId: row._id,
    });
  });
  getByRole("switch", { name: "記録を確定" }).click();
  expect(onSkip).toHaveBeenCalledWith(row._id);
});

test("未着手はスイッチがオフでバッジとツールチップが出る", async () => {
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByText("未着手")).toBeDefined();
  expect((getByRole("switch", { name: "記録を確定" }) as HTMLInputElement).checked).toBe(false);
  getByRole("switch", { name: "記録を確定" }).focus();
  await waitFor(() => {
    expect(document.body.textContent).toContain("まだ決めていない");
  });
});

test("警告中でも記録の確定はロックされない", () => {
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
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByText("睡眠が7時間未満です。記録の確定はできます。")).toBeDefined();
  expect((getByRole("switch", { name: "記録を確定" }) as HTMLInputElement).disabled).toBe(false);
});

test("今夜の就寝に日付ピッカーはない", () => {
  const { getByLabelText, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
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
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByRole("button", { name: "共有文をコピー" })).toBeDefined();
});

test("セクションはプリセット、記録、コンディション、睡眠の順。コンディションは未選択のまま普通にしない", () => {
  const onSaveCondition = vi.fn();
  const { getAllByRole, getByRole } = renderWithMantine(
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
      selectedPresetId={null}
    />,
  );
  const sectionTitles = getAllByRole("heading")
    .map((heading) => heading.textContent)
    .filter(
      (text) =>
        text === "プリセット" || text === "記録" || text === "コンディション" || text === "睡眠",
    );
  expect(sectionTitles).toEqual(["プリセット", "記録", "コンディション", "睡眠"]);
  expect((getByRole("combobox", { name: "今日のプリセット切替" }) as HTMLInputElement).value).toBe(
    "月曜日",
  );
  expect((getByRole("radio", { name: "好調" }) as HTMLInputElement).checked).toBe(false);
  expect((getByRole("radio", { name: "普通" }) as HTMLInputElement).checked).toBe(false);
  expect((getByRole("radio", { name: "崩れた" }) as HTMLInputElement).checked).toBe(false);
  expect(onSaveCondition).not.toHaveBeenCalled();
});

test("プリセットを選ぶと表示名が変わる", async () => {
  const onSwitchPreset = vi.fn();
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onSwitchPreset={onSwitchPreset}
      presets={[
        { _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 },
        { _id: "p2" as never, lines: [], name: "火の雛形", weekday: 2 },
      ]}
      selectedPresetId={null}
      {...{ ...idleHandlers, onSwitchPreset }}
    />,
  );
  getByRole("combobox", { name: "今日のプリセット切替" }).click();
  getByRole("option", { hidden: true, name: "火の雛形" }).click();
  await waitFor(() => {
    expect(onSwitchPreset).toHaveBeenCalledWith("p2");
  });
});

test("未来の日は記録を足せず今夜も出さない", () => {
  const future = { ...day, isFuture: true } satisfies DayPage;
  const { queryByRole, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-20"
      day={future}
      isToday={false}
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(queryByRole("button", { name: "記録を足す" })).toBeNull();
  expect(queryByLabelText(/今夜の就寝/)).toBeNull();
});

test("過去の日は起床を出せるが今夜の就寝は出さない", () => {
  const { getByLabelText, queryByLabelText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-16"
      day={day}
      isToday={false}
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByLabelText("起床")).toBeDefined();
  expect(queryByLabelText(/今夜の就寝/)).toBeNull();
});

test("その日に記録を足せる", () => {
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByRole("combobox", { name: /その日限りの項目/ })).toBeDefined();
  expect(getByRole("button", { name: "記録を足す" })).toBeDefined();
});

test("記録のゴミ箱はアイコンボタン", () => {
  const onRemoveRow = vi.fn();
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={onRemoveRow}
      onSaveBed={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSaveWake={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  getByRole("button", { name: "ゴミ箱へ" }).click();
  expect(onRemoveRow).toHaveBeenCalledWith(row._id);
});
