import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { DayBoard } from "~/features/today/components/day-board";
import type { DayPage, DayRow } from "~/features/today/types/day";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, pending] = [STATUSES[0], STATUSES[1]] as const;

const {
  navigate,
  onAddRow,
  onConfirm,
  onCopyYesterday,
  onRemoveDay,
  onRemoveRow,
  onSaveCondition,
  onSaveMemo,
  onSkip,
  onSwitchPreset,
  appliedPresetRef,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  onAddRow: vi.fn(async () => undefined),
  onConfirm: vi.fn(async () => undefined),
  onCopyYesterday: vi.fn(async () => undefined),
  onRemoveDay: vi.fn(async () => undefined),
  onRemoveRow: vi.fn(async () => undefined),
  onSaveCondition: vi.fn(async () => undefined),
  onSaveMemo: vi.fn(async () => undefined),
  onSkip: vi.fn(async () => undefined),
  onSwitchPreset: vi.fn(async () => undefined),
  appliedPresetRef: { current: null },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: () => ({ data: [] }),
}));

vi.mock("~/features/today/hooks/use-day-board-actions", () => ({
  useDayBoardActions: () => ({
    onAddRow,
    onConfirm,
    onCopyYesterday,
    onRemoveDay,
    onRemoveRow,
    onSaveCondition,
    onSaveMemo,
    onSkip,
    onSwitchPreset,
  }),
}));

vi.mock("~/features/today/hooks/use-apply-preset-from-search", () => ({
  useApplyPresetFromSearch: () => ({
    appliedPresetRef,
    defaultPresetId: null,
    selectedPresetId: null,
    switchPreset: vi.fn(),
  }),
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

test("確定直後の残量を記録カードに出す", () => {
  const { getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      todayJst="2026-08-17"
      items={items}
      presets={[]}
      remainderMessage="多聴 今週の週間ターゲット あと30分"
    />,
  );
  expect(getByText("多聴 今週の週間ターゲット あと30分")).toBeDefined();
});

test("ログイン済みなら今日の未着手の記録が見える", () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  expect(getByRole("combobox", { name: "Distinction 2000のひとこと" })).toBeDefined();
  expect(getByText("未着手")).toBeDefined();
  expect(queryByText(/今週の週間ターゲット/)).toBeNull();
});

test("記録を確定スイッチで確定、オフでスキップできる", async () => {
  onConfirm.mockClear();
  onSkip.mockClear();
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
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
  onConfirm.mockClear();
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
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
  onConfirm.mockClear();
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
      presets={[]}
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
  onSkip.mockClear();
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
      presets={[]}
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
  onSkip.mockClear();
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
      presets={[]}
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
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
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
    />,
  );
  expect(getByRole("button", { name: "共有文をコピー" })).toBeDefined();
});

test("セクションはプリセット、記録、コンディションの順。コンディションは未選択のまま普通にしない", () => {
  onSaveCondition.mockClear();
  const { getAllByRole, getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={day}
      todayJst="2026-08-17"
      items={items}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 }]}
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
  onSwitchPreset.mockClear();
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
    />,
  );
  getByRole("combobox", { name: "プリセット切替" }).click();
  getByRole("option", { hidden: true, name: "火の雛形" }).click();
  await waitFor(() => {
    expect(onSwitchPreset).toHaveBeenCalledWith("p2", appliedPresetRef);
  });
});

test("未来の日は記録を足せない", () => {
  const future = { ...day, kind: "unrecorded" } satisfies DayPage;
  const { queryByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-20" day={future} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  expect(queryByRole("button", { name: "記録を足す" })).toBeNull();
});

test("その日に記録を足せる", () => {
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  expect(getByRole("combobox", { name: /その日限りの項目/ })).toBeDefined();
  expect(getByRole("button", { name: "記録を足す" })).toBeDefined();
});

test("記録のゴミ箱はアイコンボタン", () => {
  onRemoveRow.mockClear();
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  getByRole("button", { name: "ゴミ箱へ" }).click();
  expect(onRemoveRow).toHaveBeenCalledWith(row._id);
});

test("今日は学習日ピッカーと前の日があり、次の日と今日へ戻るは出ない", () => {
  const { getByLabelText, getByRole, queryByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} items={items} presets={[]} todayJst="2026-08-17" />,
  );
  expect(getByLabelText("学習日")).toBeDefined();
  expect(getByRole("button", { name: "前の日" })).toBeDefined();
  expect((getByRole("button", { name: "次の日" }) as HTMLButtonElement).disabled).toBe(true);
  expect(queryByRole("button", { name: "今日へ戻る" })).toBeNull();
});

test("今日で日が無いとこの日の記録はありません", () => {
  const todayEmpty = {
    ...day,
    day: null,
    kind: "todayEmpty",
    rows: [],
  } satisfies DayPage;
  const { getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={todayEmpty}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  expect(getByText("この日の記録はありません")).toBeDefined();
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
      todayJst="2026-08-17"
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
    <DayBoard dateJst="2026-08-20" day={future} items={items} presets={[]} todayJst="2026-08-17" />,
  );
  expect(getByText("未記録")).toBeDefined();
  expect(queryByRole("button", { name: "昨日の確定をコピー" })).toBeNull();
  expect(queryByRole("button", { name: "記録を足す" })).toBeNull();
});

test("未記録の前の日はさらに前の未記録へ進む", () => {
  navigate.mockClear();
  const future = {
    ...day,
    dateJst: "2026-08-20",
    day: null,
    kind: "unrecorded",
    rows: [],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-20" day={future} items={items} presets={[]} todayJst="2026-08-17" />,
  );
  const prev = getByRole("button", { name: "前の日" });
  expect((prev as HTMLButtonElement).disabled).toBe(false);
  expect((getByRole("button", { name: "次の日" }) as HTMLButtonElement).disabled).toBe(true);
  prev.click();
  expect(navigate).toHaveBeenCalledWith({
    params: { dateJst: "2026-08-19" },
    to: "/days/$dateJst",
  });
});

test("昨日の確定をコピーできるときは押せる", () => {
  onCopyYesterday.mockClear();
  const copyable = { ...day, canCopyYesterday: true } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={copyable}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("button", { name: "昨日の確定をコピー" }).click();
  expect(onCopyYesterday).toHaveBeenCalledTimes(1);
});

const SATURDAY_PRESET = { _id: "pSat" as never, lines: [], name: "土曜日", weekday: 6 };
const MONDAY_PRESET = { _id: "pMon" as never, lines: [], name: "月曜日", weekday: 1 };

test("過去の休養でその曜日の雛形を選ぶと切り替わる", async () => {
  onSwitchPreset.mockClear();
  const restDay = {
    ...day,
    dateJst: "2026-08-15",
    day: null,
    kind: "rest",
    rows: [],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-15"
      day={restDay}
      items={items}
      presets={[SATURDAY_PRESET, MONDAY_PRESET]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("combobox", { name: "プリセット切替" }).click();
  getByRole("option", { hidden: true, name: "土曜日" }).click();
  await waitFor(() => {
    expect(onSwitchPreset).toHaveBeenCalledWith("pSat", appliedPresetRef);
  });
});

test("過去日で別の雛形に切り替えても表示は戻らない", async () => {
  onSwitchPreset.mockClear();
  const pastLive = {
    ...day,
    dateJst: "2026-08-15",
    day: {
      _id: "day-past" as NonNullable<DayPage["day"]>["_id"],
      condition: null,
      dateJst: "2026-08-15",
      memo: null,
    },
    kind: "live",
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-15"
      day={pastLive}
      items={items}
      presets={[SATURDAY_PRESET, MONDAY_PRESET]}
      todayJst="2026-08-17"
    />,
  );
  expect((getByRole("combobox", { name: "プリセット切替" }) as HTMLInputElement).value).toBe(
    "土曜日",
  );
  getByRole("combobox", { name: "プリセット切替" }).click();
  getByRole("option", { hidden: true, name: "月曜日" }).click();
  await waitFor(() => {
    expect(onSwitchPreset).toHaveBeenCalledWith("pMon", appliedPresetRef);
  });
  expect((getByRole("combobox", { name: "プリセット切替" }) as HTMLInputElement).value).toBe(
    "月曜日",
  );
});
