import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { DayBoard } from "~/features/today/components/day-board";
import type { DayPage, DayRow } from "~/features/today/types/day";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, pending] = [STATUSES[0], STATUSES[1]] as const;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const CONCRETE_ACTION = "Unit 1 を音読する";
const CONCRETE_ACTION_2 = "Unit 2 を音読する";

const row = {
  _id: "row1" as DayRow["_id"],
  category: "多聴",
  categorySortOrder: 1,
  content: "",
  itemId: "item1" as DayRow["itemId"],
  itemName: "Distinction 2000",
  minutes: 30,
  sortOrder: 0,
  status: pending,
} satisfies DayRow;

const day = {
  dateJst: "2026-08-17",
  day: {
    _id: "day1" as NonNullable<DayPage["day"]>["_id"],
    condition: null,
    dateJst: "2026-08-17",
    memo: null,
  },
  isFuture: false,
  rows: [row],
  shareMarkdown: "",
  volumeMinutes: 0,
} satisfies DayPage;

const items = [
  { _id: row.itemId, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
];

const idleHandlers = {
  onAddRow: vi.fn(),
  onConfirm: vi.fn(),
  onRemoveDay: vi.fn(),
  onRemoveRow: vi.fn(),
  onSaveCondition: vi.fn(),
  onSaveMemo: vi.fn(),
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
  expect(getByRole("textbox", { name: "Distinction 2000の具体的手順" })).toBeDefined();
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
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={onSkip}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  const input = getByRole("textbox", { name: "Distinction 2000の具体的手順" });
  fireEvent.change(input, { target: { value: CONCRETE_ACTION } });
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith({
      content: CONCRETE_ACTION,
      minutes: 30,
      rowId: row._id,
    });
  });
});

test("空の具体的手順では確定できない", async () => {
  const onConfirm = vi.fn();
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
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  const input = getByRole("textbox", { name: "Distinction 2000の具体的手順" });
  fireEvent.change(input, { target: { value: "   " } });
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

test("確定済みの記録は行外へフォーカスすると更新できる", async () => {
  const onConfirm = vi.fn();
  const confirmedDay = {
    ...day,
    rows: [{ ...row, content: CONCRETE_ACTION, status: confirmed }],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={confirmedDay}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={onConfirm}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  const input = getByRole("textbox", { name: "Distinction 2000の具体的手順" });
  fireEvent.change(input, { target: { value: CONCRETE_ACTION_2 } });
  fireEvent.blur(input);
  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith({
      content: CONCRETE_ACTION_2,
      minutes: 30,
      rowId: row._id,
    });
  });
});

test("確定済みの記録をスイッチオフで見送り確認後にスキップできる", async () => {
  const onSkip = vi.fn();
  const confirmedDay = {
    ...day,
    rows: [{ ...row, status: confirmed }],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={confirmedDay}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={onSkip}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  getByRole("switch", { name: "記録を確定" }).click();
  expect(onSkip).not.toHaveBeenCalled();
  await waitFor(() => {
    expect(getByRole("button", { name: "見送りにする" })).toBeDefined();
  });
  getByRole("button", { name: "見送りにする" }).click();
  expect(onSkip).toHaveBeenCalledWith(row._id);
});

test("確定済みの見送り確認をキャンセルするとスキップしない", async () => {
  const onSkip = vi.fn();
  const confirmedDay = {
    ...day,
    rows: [{ ...row, status: confirmed }],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={confirmedDay}
      isToday
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onRemoveDay={vi.fn()}
      onRemoveRow={vi.fn()}
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={onSkip}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(getByRole("button", { name: "キャンセル" })).toBeDefined();
  });
  getByRole("button", { name: "キャンセル" }).click();
  expect(onSkip).not.toHaveBeenCalled();
});

test("未着手はスイッチがオフで未着手バッジが出る", () => {
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

test("セクションはプリセット、記録、コンディションの順。コンディションは未選択のまま普通にしない", () => {
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
      onSaveCondition={onSaveCondition}
      onSaveMemo={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 }]}
      selectedPresetId={null}
    />,
  );
  const sectionTitles = getAllByRole("heading")
    .map((heading) => heading.textContent)
    .filter((text) => text === "プリセット" || text === "記録" || text === "コンディション");
  expect(sectionTitles).toEqual(["プリセット", "記録", "コンディション"]);
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

test("未来の日は記録を足せない", () => {
  const future = { ...day, isFuture: true } satisfies DayPage;
  const { queryByRole } = renderWithMantine(
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
      onSaveCondition={vi.fn()}
      onSaveMemo={vi.fn()}
      onSkip={vi.fn()}
      onSwitchPreset={vi.fn()}
      presets={[]}
      selectedPresetId={null}
    />,
  );
  getByRole("button", { name: "ゴミ箱へ" }).click();
  expect(onRemoveRow).toHaveBeenCalledWith(row._id);
});
