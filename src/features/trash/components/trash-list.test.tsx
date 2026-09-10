import { fireEvent, waitFor, within } from "@testing-library/react";
import { Result } from "better-result";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";
import { TRASH_PURGE_SELECTION_LIMIT } from "~domain/trashSelection";

import { TrashList } from "~/features/trash/components/trash-list";
import type { TrashPage } from "~/features/trash/types/trash";
import { MutationFailedError } from "~/lib/errors";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed] = STATUSES;
const purgeManySuccess: ComponentProps<typeof TrashList>["onPurgeMany"] = async () =>
  Result.ok(null);

test("ゴミ箱と復元・完全削除が見える", async () => {
  const onRestoreRow = vi.fn();
  const onPurgeRow = vi.fn();
  const trash = {
    days: [{ _id: "d1" as never, dateJst: "2026-08-17", deletedAt: 1 }],
    rows: [
      {
        _id: "r1" as never,
        content: "Unit 1",
        dateJst: "2026-08-17",
        deletedAt: 1,
        dayId: "d1" as never,
        itemName: "Distinction 2000",
        minutes: 30,
        status: confirmed,
      },
    ],
  } satisfies TrashPage;

  const { getAllByRole, getByText } = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={purgeManySuccess}
      onPurgeRow={onPurgeRow}
      onRestoreDay={vi.fn()}
      onRestoreMany={vi.fn(async () => null)}
      onRestoreRow={onRestoreRow}
      trash={trash}
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText(/Unit 1 30分/)).toBeDefined();
  getAllByRole("button", { name: "戻す" })[1]?.click();
  expect(onRestoreRow).toHaveBeenCalled();
  fireEvent.click(getAllByRole("button", { name: "完全削除" })[1]!);
  await waitFor(() => {
    expect(getByText(/を完全に削除します/)).toBeDefined();
  });
  fireEvent.click(within(document.body).getAllByRole("button", { name: "完全削除" }).at(-1)!);
  expect(onPurgeRow).toHaveBeenCalled();
});

test("記録の選択では親の日も一括復元対象になる", async () => {
  const onRestoreMany = vi.fn(async () => ({
    failedDayIds: [],
    failedDayReasons: [],
    failedRowIds: [],
    failedRowReasons: [],
    restoredDayIds: ["d1" as never],
    restoredRowIds: ["r1" as never],
  }));
  const trash = {
    days: [{ _id: "d1" as never, dateJst: "2026-08-17", deletedAt: 1 }],
    rows: [
      {
        _id: "r1" as never,
        content: "Unit 1",
        dateJst: "2026-08-17",
        deletedAt: 1,
        dayId: "d1" as never,
        itemName: "Distinction 2000",
        minutes: 30,
        status: confirmed,
      },
    ],
  } satisfies TrashPage;

  const { getByRole, getByText } = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={purgeManySuccess}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={onRestoreMany}
      onRestoreRow={vi.fn()}
      trash={trash}
    />,
  );

  fireEvent.click(getByRole("checkbox", { name: /Unit 1/ }));
  expect(getByText(/復元では、選択した記録の親の日/)).toBeDefined();
  fireEvent.click(getByRole("button", { name: "まとめて戻す" }));
  await waitFor(() => {
    expect(onRestoreMany).toHaveBeenCalledWith({ dayIds: ["d1"], rowIds: ["r1"] });
  });
});

test("一括復元の通信失敗後も選択を保ち、成功するまで再試行できる", async () => {
  let finishRestore: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    finishRestore = resolve;
  });
  const dayId = "d1" as TrashPage["days"][number]["_id"];
  const onRestoreMany = vi
    .fn<ComponentProps<typeof TrashList>["onRestoreMany"]>()
    .mockImplementationOnce(async () => {
      await pending;
      return null;
    })
    .mockResolvedValueOnce({
      failedDayIds: [],
      failedDayReasons: [],
      failedRowIds: [],
      failedRowReasons: [],
      restoredDayIds: [dayId],
      restoredRowIds: [],
    });
  const view = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={purgeManySuccess}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={onRestoreMany}
      onRestoreRow={vi.fn()}
      trash={{ days: [{ _id: dayId, dateJst: "2026-08-17", deletedAt: 1 }], rows: [] }}
    />,
  );
  const dayCheckbox = view.getByRole("checkbox", { name: "2026-08-17" });
  fireEvent.click(dayCheckbox);
  fireEvent.click(view.getByRole("button", { name: "まとめて戻す" }));
  expect(view.getByRole("button", { name: "復元中…" }).hasAttribute("disabled")).toBe(true);

  finishRestore?.();

  const retryButton = await view.findByRole("button", { name: "まとめて戻す" });
  expect(dayCheckbox.matches(":checked")).toBe(true);
  fireEvent.click(retryButton);
  await waitFor(() => expect(dayCheckbox.matches(":checked")).toBe(false));
  expect(onRestoreMany).toHaveBeenNthCalledWith(2, { dayIds: [dayId], rowIds: [] });
});

test("一括復元の失敗理由を表示し、成功済みの日を除いて再試行する", async () => {
  const dayId = "d1" as TrashPage["days"][number]["_id"];
  const failedDayId = "d2" as TrashPage["days"][number]["_id"];
  const onRestoreMany = vi
    .fn<ComponentProps<typeof TrashList>["onRestoreMany"]>()
    .mockResolvedValueOnce({
      failedDayIds: [failedDayId],
      failedDayReasons: [{ dayId: failedDayId, reason: "再読み込みしてお試しください" }],
      failedRowIds: [],
      failedRowReasons: [],
      restoredDayIds: [dayId],
      restoredRowIds: [],
    })
    .mockResolvedValueOnce({
      failedDayIds: [],
      failedDayReasons: [],
      failedRowIds: [],
      failedRowReasons: [],
      restoredDayIds: [failedDayId],
      restoredRowIds: [],
    });
  const view = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={purgeManySuccess}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={onRestoreMany}
      onRestoreRow={vi.fn()}
      trash={{
        days: [
          { _id: dayId, dateJst: "2026-08-17", deletedAt: 1 },
          { _id: failedDayId, dateJst: "2026-08-18", deletedAt: 1 },
        ],
        rows: [],
      }}
    />,
  );
  fireEvent.click(view.getByRole("checkbox", { name: "2026-08-17" }));
  const failedDayCheckbox = view.getByRole("checkbox", { name: "2026-08-18" });
  fireEvent.click(failedDayCheckbox);
  fireEvent.click(view.getByRole("button", { name: "まとめて戻す" }));
  const retryButton = await view.findByRole("button", { name: "失敗した対象を再試行" });
  expect(view.getByText("2026-08-18の日: 再読み込みしてお試しください")).toBeDefined();
  expect(view.getByRole("checkbox", { name: "2026-08-17" }).matches(":checked")).toBe(false);
  expect(failedDayCheckbox.matches(":checked")).toBe(true);

  fireEvent.click(retryButton);

  await waitFor(() => expect(failedDayCheckbox.matches(":checked")).toBe(false));
  expect(onRestoreMany).toHaveBeenNthCalledWith(2, { dayIds: [failedDayId], rowIds: [] });
  expect(view.queryByText(/再読み込みしてお試しください/)).toBeNull();
});

test("記録だけの一括完全削除では復元用の親の日を送信しない", async () => {
  const onPurgeMany = vi
    .fn<ComponentProps<typeof TrashList>["onPurgeMany"]>()
    .mockResolvedValue(Result.ok(null));
  const dayId = "d1" as TrashPage["days"][number]["_id"];
  const rowId = "r1" as TrashPage["rows"][number]["_id"];
  const view = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={onPurgeMany}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={vi.fn(async () => null)}
      onRestoreRow={vi.fn()}
      trash={{
        days: [{ _id: dayId, dateJst: "2026-08-17", deletedAt: 1 }],
        rows: [
          {
            _id: rowId,
            content: "Unit 1",
            dateJst: "2026-08-17",
            deletedAt: 1,
            dayId,
            itemName: "Distinction 2000",
            minutes: 30,
            status: confirmed,
          },
        ],
      }}
    />,
  );

  fireEvent.click(view.getByRole("checkbox", { name: /Unit 1/ }));
  const dayCheckbox = view.getByRole("checkbox", { name: "2026-08-17" });
  expect((dayCheckbox as HTMLInputElement).indeterminate).toBe(true);
  expect(view.getByText(/完全削除には含めません/)).toBeDefined();

  fireEvent.click(view.getByRole("button", { name: "まとめて完全削除" }));
  const dialog = await view.findByRole("dialog");
  expect(within(dialog).getByText(/親の日 1件は、今回の完全削除には含まれません/)).toBeDefined();
  fireEvent.click(within(dialog).getByRole("button", { name: "完全削除" }));

  await waitFor(() => expect(onPurgeMany).toHaveBeenCalledWith({ dayIds: [], rowIds: [rowId] }));
  expect(dayCheckbox.matches(":checked")).toBe(false);
  expect(view.getByRole("checkbox", { name: /Unit 1/ }).matches(":checked")).toBe(false);
});

test("一括完全削除に失敗したときは選択と確認画面を保つ", async () => {
  const onPurgeMany = vi
    .fn<ComponentProps<typeof TrashList>["onPurgeMany"]>()
    .mockResolvedValue(Result.err(new MutationFailedError({ message: "完全削除に失敗しました" })));
  const dayId = "d1" as TrashPage["days"][number]["_id"];
  const view = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={onPurgeMany}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={vi.fn(async () => null)}
      onRestoreRow={vi.fn()}
      trash={{ days: [{ _id: dayId, dateJst: "2026-08-17", deletedAt: 1 }], rows: [] }}
    />,
  );

  const dayCheckbox = view.getByRole("checkbox", { name: "2026-08-17" });
  fireEvent.click(dayCheckbox);
  fireEvent.click(view.getByRole("button", { name: "まとめて完全削除" }));
  const dialog = await view.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "完全削除" }));

  await waitFor(() => expect(onPurgeMany).toHaveBeenCalledWith({ dayIds: [dayId], rowIds: [] }));
  expect(dayCheckbox.matches(":checked")).toBe(true);
  expect(view.getByRole("dialog")).toBeDefined();
});

test("一括完全削除の上限を超えた選択は送信できない", () => {
  const days = Array.from({ length: TRASH_PURGE_SELECTION_LIMIT + 1 }, (_, index) => ({
    _id: `d${index}` as TrashPage["days"][number]["_id"],
    dateJst: `2026-08-${String(index + 1).padStart(2, "0")}`,
    deletedAt: 1,
  }));
  const view = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeMany={purgeManySuccess}
      onPurgeRow={vi.fn()}
      onRestoreDay={vi.fn()}
      onRestoreMany={vi.fn(async () => null)}
      onRestoreRow={vi.fn()}
      trash={{ days, rows: [] }}
    />,
  );

  const selectAllDays = view.getAllByRole("checkbox", { name: "すべて選択" })[0];
  if (selectAllDays === undefined) {
    throw new Error("日の全選択が見つかりません");
  }
  fireEvent.click(selectAllDays);

  expect(view.getByText(/まとめて完全削除は 100件まで/)).toBeDefined();
  expect(view.getByRole("button", { name: "まとめて完全削除" }).hasAttribute("disabled")).toBe(
    true,
  );
}, 20_000);
