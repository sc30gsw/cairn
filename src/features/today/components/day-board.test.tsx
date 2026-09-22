import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { DayBoard } from "~/features/today/components/day-board";
import {
  CONCRETE_ACTION,
  CONCRETE_ACTION_2,
  dayBoardTestDay,
  dayBoardTestItems,
  dayBoardTestRow,
} from "~/features/today/components/day-board.test-fixtures";
import type { DayPage } from "~/features/today/types/day";
import type { MutationResult } from "~/lib/run-mutation";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed] = STATUSES;

const {
  navigate,
  onAddRow,
  onConfirm,
  onConfirmMany,
  onCopyYesterday,
  onFlagReview,
  onRemoveDay,
  onRemoveRow,
  onSaveCondition,
  onSaveMemo,
  onSkip,
  onSkipMany,
  onUnflagReview,
  onUnskip,
  onUnskipMany,
  useDayPageDateJstMock,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  onAddRow: vi.fn(async () => undefined),
  onConfirm: vi.fn<() => Promise<MutationResult>>(),
  onConfirmMany: vi.fn<() => Promise<MutationResult>>(),
  onCopyYesterday: vi.fn(async () => undefined),
  onRemoveDay: vi.fn(async () => undefined),
  onRemoveRow: vi.fn(async () => undefined),
  onSaveCondition: vi.fn(async () => undefined),
  onSaveMemo: vi.fn(async () => undefined),
  onFlagReview: vi.fn(async () => undefined),
  onSkip: vi.fn(async () => undefined),
  onSkipMany: vi.fn(async () => undefined),
  onUnflagReview: vi.fn(async () => undefined),
  onUnskip: vi.fn(async () => undefined),
  onUnskipMany: vi.fn(async () => undefined),
  useDayPageDateJstMock: vi.fn(() => "2026-08-17"),
}));

beforeEach(() => {
  onConfirm.mockResolvedValue(Result.ok(null));
  onConfirmMany.mockResolvedValue(Result.ok(null));
});

vi.mock("~/features/today/hooks/use-day-page-date-jst", () => ({
  useDayPageDateJst: useDayPageDateJstMock,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
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
    onFlagReview,
    onRemoveDay,
    onRemoveRow,
    onSaveCondition,
    onSaveMemo,
    onSkip,
    onSkipMany,
    onUnflagReview,
    onUnskip,
    onUnskipMany,
    onConfirmMany,
  }),
}));

const row = dayBoardTestRow;
const day = dayBoardTestDay;
const items = dayBoardTestItems;

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

test("同じ項目の記録は1つの項目として出し、件数と合計を見出しに置く", () => {
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 15,
    sortOrder: 1,
    status: confirmed,
  };
  const { getAllByRole, getByRole, getByText, queryByRole, queryByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [dayBoardTestRow, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );

  expect(getByText("2件 · 未完了1 · 完了1")).toBeDefined();
  expect(getByText("合計 45分")).toBeDefined();
  expect(getByText("未完了")).toBeDefined();
  expect(queryByText("未完了予定")).toBeNull();
  expect(getAllByRole("combobox", { name: "Distinction 2000のひとこと" })).toHaveLength(1);
  expect(getAllByRole("form", { name: "Distinction 2000の記録" })).toHaveLength(1);
  expect(queryByRole("combobox", { name: /Distinction 2000 \d件目/ })).toBeNull();
  const minutes = within(getByRole("form", { name: "Distinction 2000の記録" })).getByRole(
    "textbox",
    { name: "分数" },
  ) as HTMLInputElement;
  expect(minutes.disabled).toBe(false);
  expect(minutes.value).toBe("45");
});

test("グループの確定は合計を件数で割って各記録へ書く", async () => {
  onConfirmMany.mockClear();
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 15,
    sortOrder: 1,
    status: confirmed,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [dayBoardTestRow, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirmMany).toHaveBeenCalledWith([
      { content: "", minutes: 22, rowId: dayBoardTestRow._id },
      { content: "", minutes: 22, rowId: second._id },
    ]);
  });
});

test("グループの分数欄は合計を均等分割し余りは捨てる", async () => {
  onConfirmMany.mockClear();
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 15,
    sortOrder: 1,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [dayBoardTestRow, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  const form = getByRole("form", { name: "Distinction 2000の記録" });
  fireEvent.change(within(form).getByRole("textbox", { name: "分数" }), {
    target: { value: "61" },
  });
  within(form).getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirmMany).toHaveBeenCalledWith([
      { content: "", minutes: 30, rowId: dayBoardTestRow._id },
      { content: "", minutes: 30, rowId: second._id },
    ]);
  });
  expect((within(form).getByRole("textbox", { name: "分数" }) as HTMLInputElement).value).toBe(
    "60",
  );
});

test("グループの確定は結合したひとことを全行へ書く", async () => {
  onConfirmMany.mockClear();
  const first = { ...dayBoardTestRow, content: "Unit 1" };
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    content: "Unit 2",
    minutes: 30,
    sortOrder: 1,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [first, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirmMany).toHaveBeenCalledWith([
      { content: "Unit 1、Unit 2", minutes: 30, rowId: first._id },
      { content: "Unit 1、Unit 2", minutes: 30, rowId: second._id },
    ]);
  });
});

test("確定済みグループは欄を離すと分数とひとことを書く", async () => {
  onConfirmMany.mockClear();
  const first = { ...dayBoardTestRow, content: CONCRETE_ACTION, minutes: 30, status: confirmed };
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    content: CONCRETE_ACTION,
    minutes: 30,
    sortOrder: 1,
    status: confirmed,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [first, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  const form = getByRole("form", { name: "Distinction 2000の記録" });
  const content = within(form).getByRole("combobox", { name: "Distinction 2000のひとこと" });
  fireEvent.change(content, { target: { value: CONCRETE_ACTION_2 } });
  fireEvent.blur(content);
  await waitFor(() => {
    expect(onConfirmMany).toHaveBeenCalledWith([
      { content: CONCRETE_ACTION_2, minutes: 30, rowId: first._id },
      { content: CONCRETE_ACTION_2, minutes: 30, rowId: second._id },
    ]);
  });
});

test("計測中の行は経過分を合計の初期値に入れ、確定は分割して計測を捨てる", async () => {
  onConfirmMany.mockClear();
  const measuring = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 30,
    sortOrder: 1,
    status: STATUSES[2],
    timer: { accumulatedMs: 12 * 60_000, autoStoppedAt: null, startedAt: null },
  };
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [dayBoardTestRow, measuring] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  expect(getByText("合計 42分")).toBeDefined();
  const form = getByRole("form", { name: "Distinction 2000の記録" });
  expect((within(form).getByRole("textbox", { name: "分数" }) as HTMLInputElement).value).toBe(
    "42",
  );
  within(form).getByRole("switch", { name: "記録を確定" }).click();
  await waitFor(() => {
    expect(onConfirmMany).toHaveBeenCalledWith([
      { content: "", minutes: 21, rowId: dayBoardTestRow._id },
      { content: "", minutes: 21, rowId: measuring._id },
    ]);
  });
});

test("グループの見送り取消はスキップした記録だけ戻す", async () => {
  onUnskipMany.mockClear();
  const skipped = STATUSES[3];
  const first = { ...dayBoardTestRow, status: skipped };
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 15,
    sortOrder: 1,
    status: skipped,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [first, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("button", { name: "見送りを取り消す" }).click();
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeDefined();
  });
  within(screen.getByRole("dialog")).getByRole("button", { name: "見送りを取り消す" }).click();
  expect(onUnskipMany).toHaveBeenCalledWith([first._id, second._id]);
});

test("グループの見送りはその項目の記録をすべて見送りにする", async () => {
  onSkipMany.mockClear();
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    minutes: 15,
    sortOrder: 1,
  };
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [dayBoardTestRow, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  getByRole("button", { name: "見送りにする" }).click();
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeDefined();
  });
  within(screen.getByRole("dialog")).getByRole("button", { name: "見送りにする" }).click();
  expect(onSkipMany).toHaveBeenCalledWith([dayBoardTestRow._id, second._id]);
});

test("ひとことが記録ごとに違っても日は1欄に出し、スキップが1件でも見送りにする", () => {
  const skipped = STATUSES[3];
  const first = { ...dayBoardTestRow, content: "Unit 1" };
  const second = {
    ...dayBoardTestRow,
    _id: "row2" as (typeof dayBoardTestRow)["_id"],
    content: "Unit 2",
    minutes: 15,
    sortOrder: 1,
    status: skipped,
  };
  const { getByRole, getByText } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={{ ...day, rows: [first, second] }}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  expect(
    (getByRole("combobox", { name: "Distinction 2000のひとこと" }) as HTMLInputElement).value,
  ).toBe("Unit 1、Unit 2");
  expect(getByText("見送り")).toBeDefined();
  expect(getByText("2件 · 未完了1 · 完了0")).toBeDefined();
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

test("未着手は見送りボタンから確認後にスキップできる", async () => {
  onSkip.mockClear();
  const { getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );

  getByRole("button", { name: "見送りにする" }).click();
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeDefined();
  });
  within(screen.getByRole("dialog")).getByRole("button", { name: "見送りにする" }).click();
  expect(onSkip).toHaveBeenCalledWith(row._id);
});

test("見送り済みは取り消しボタンから確認後に未着手へ戻せる", async () => {
  onUnskip.mockClear();
  const skippedDay = {
    ...day,
    rows: [{ ...row, status: STATUSES[3] }],
  } satisfies DayPage;
  const { getByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-17"
      day={skippedDay}
      todayJst="2026-08-17"
      items={items}
      presets={[]}
    />,
  );

  getByRole("button", { name: "見送りを取り消す" }).click();
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeDefined();
  });
  within(screen.getByRole("dialog")).getByRole("button", { name: "見送りを取り消す" }).click();
  expect(onUnskip).toHaveBeenCalledWith(row._id);
});

test("日ページからカンバンへのリンクが見える", () => {
  const { getByText } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  expect(getByText("2026-08-17 の記録をカンバンで見る")).toBeDefined();
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

test("セクションは記録、コンディションの順。コンディションは未選択のまま普通にしない", () => {
  onSaveCondition.mockClear();
  const { getAllByRole, getByRole } = renderWithMantine(
    <DayBoard dateJst="2026-08-17" day={day} todayJst="2026-08-17" items={items} presets={[]} />,
  );
  const sectionTitles = getAllByRole("heading")
    .map((heading) => heading.textContent)
    .filter((text) => text === "プリセット" || text === "記録" || text === "コンディション");
  expect(sectionTitles).toEqual(["記録", "コンディション"]);
  expect((getByRole("radio", { name: "好調" }) as HTMLInputElement).checked).toBe(false);
  expect((getByRole("radio", { name: "普通" }) as HTMLInputElement).checked).toBe(false);
  expect((getByRole("radio", { name: "崩れた" }) as HTMLInputElement).checked).toBe(false);
  expect(onSaveCondition).not.toHaveBeenCalled();
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

test("過去の空日は休養で、コピーがある", () => {
  const restDay = {
    ...day,
    dateJst: "2026-08-15",
    day: null,
    kind: "rest",
    rows: [],
  } satisfies DayPage;
  const { getByRole, getByText, queryByRole } = renderWithMantine(
    <DayBoard
      dateJst="2026-08-15"
      day={restDay}
      items={items}
      presets={[]}
      todayJst="2026-08-17"
    />,
  );
  expect(getByText("休養")).toBeDefined();
  expect(queryByRole("combobox", { name: "プリセット切替" })).toBeNull();
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
