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

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: () => ({ data: [] }),
}));

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
  canCopyYesterday: false,
  dateJst: "2026-08-17",
  day: {
    _id: "day1" as NonNullable<DayPage["day"]>["_id"],
    condition: null,
    dateJst: "2026-08-17",
    memo: null,
  },
  kind: "live",
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
  onCopyYesterday: vi.fn(),
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
      todayJst="2026-08-17"
      items={items}
      presets={[]}
      selectedPresetId={null}
      {...idleHandlers}
    />,
  );
  expect(getByRole("combobox", { name: "Distinction 2000のひとこと" })).toBeDefined();
  expect(getByText("未着手")).toBeDefined();
});

test("記録を確定スイッチで確定、オフでスキップできる", async () => {
  const onConfirm = vi.fn();
  const onSkip = vi.fn();
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={onConfirm}
      onCopyYesterday={vi.fn()}
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
  const input = getByRole("combobox", { name: "Distinction 2000のひとこと" });
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

test("空のひとことでも確定できる", async () => {
  const onConfirm = vi.fn();
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={onConfirm}
      onCopyYesterday={vi.fn()}
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
  const input = getByRole("combobox", { name: "Distinction 2000のひとこと" });
  fireEvent.change(input, { target: { value: "   " } });
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith({
      content: "",
      minutes: 30,
      rowId: row._id,
    });
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
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={onConfirm}
      onCopyYesterday={vi.fn()}
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
  const input = getByRole("combobox", { name: "Distinction 2000のひとこと" });
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
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onCopyYesterday={vi.fn()}
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
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onCopyYesterday={vi.fn()}
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
      todayJst="2026-08-17"
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
      todayJst="2026-08-17"
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
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onCopyYesterday={vi.fn()}
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
  expect((getByRole("combobox", { name: "プリセット切替" }) as HTMLInputElement).value).toBe(
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
      todayJst="2026-08-17"
      items={items}
      presets={[
        { _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 },
        { _id: "p2" as never, lines: [], name: "火の雛形", weekday: 2 },
      ]}
      selectedPresetId={null}
      {...{ ...idleHandlers, onSwitchPreset }}
    />,
  );
  getByRole("combobox", { name: "プリセット切替" }).click();
  getByRole("option", { hidden: true, name: "火の雛形" }).click();
  await waitFor(() => {
    expect(onSwitchPreset).toHaveBeenCalledWith("p2");
  });
});

test("未来の日は記録を足せない", () => {
  const future = { ...day, kind: "unrecorded" } satisfies DayPage;
  const { queryByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-20"
      day={future}
      todayJst="2026-08-17"
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
      todayJst="2026-08-17"
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
      todayJst="2026-08-17"
      items={items}
      onAddRow={vi.fn()}
      onConfirm={vi.fn()}
      onCopyYesterday={vi.fn()}
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

test("今日は学習日ピッカーと前の日があり、次の日と今日へ戻るは出ない", () => {
  const { getByLabelText, getByRole, queryByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      items={items}
      presets={[]}
      selectedPresetId={null}
      todayJst="2026-08-17"
      {...idleHandlers}
    />,
  );
  expect(getByLabelText("学習日")).toBeDefined();
  expect(getByRole("button", { name: "前の日" })).toBeDefined();
  expect((getByRole("button", { name: "次の日" }) as HTMLButtonElement).disabled).toBe(true);
  expect(queryByRole("button", { name: "今日へ戻る" })).toBeNull();
});

test("過去の空日は休養で、プリセット切替とコピーがある", () => {
  const restDay = {
    ...day,
    dateJst: "2026-08-15",
    day: null,
    kind: "rest",
    rows: [],
  } satisfies DayPage;
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-15"
      day={restDay}
      items={items}
      presets={[{ _id: "p1" as never, lines: [], name: "土曜日", weekday: 6 }]}
      selectedPresetId={null}
      todayJst="2026-08-17"
      {...idleHandlers}
    />,
  );
  expect(getByText("休養")).toBeDefined();
  expect(getByRole("combobox", { name: "プリセット切替" })).toBeDefined();
  expect((getByRole("button", { name: "昨日の確定をコピー" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(getByRole("button", { name: "今日へ戻る" })).toBeDefined();
  expect(getByRole("button", { name: "記録を足す" })).toBeDefined();
});

test("未来の空日は未記録で足せない", () => {
  const future = {
    ...day,
    dateJst: "2026-08-20",
    day: null,
    kind: "unrecorded",
    rows: [],
  } satisfies DayPage;
  const { getByText, queryByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-20"
      day={future}
      items={items}
      presets={[]}
      selectedPresetId={null}
      todayJst="2026-08-17"
      {...idleHandlers}
    />,
  );
  expect(getByText("未記録")).toBeDefined();
  expect(queryByRole("button", { name: "昨日の確定をコピー" })).toBeNull();
  expect(queryByRole("button", { name: "記録を足す" })).toBeNull();
});

test("昨日の確定をコピーできるときは押せる", () => {
  const onCopyYesterday = vi.fn();
  const copyable = { ...day, canCopyYesterday: true } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={copyable}
      items={items}
      presets={[]}
      selectedPresetId={null}
      todayJst="2026-08-17"
      {...{ ...idleHandlers, onCopyYesterday }}
    />,
  );
  getByRole("button", { name: "昨日の確定をコピー" }).click();
  expect(onCopyYesterday).toHaveBeenCalledTimes(1);
});
