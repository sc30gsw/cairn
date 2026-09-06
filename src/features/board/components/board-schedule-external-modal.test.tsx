import { fireEvent, within } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { BoardScheduleExternalModal } from "~/features/board/components/board-schedule-external-modal";
import type { BoardExternalEvent } from "~/features/board/types/board";
import { MutationFailedError } from "~/lib/errors";
import { renderWithMantine } from "~/test-utils/render";

const EXTERNAL: BoardExternalEvent = {
  _id: "ext1" as Id<"externalCalendarEvents">,
  allDay: false,
  calendarId: "owner@example.com",
  calendarName: "仕事",
  calendarEmail: "owner@example.com",
  colorId: null,
  canEdit: true,
  color: "#9fe1cb",
  endAt: "2026-08-18 11:00:00",
  startAt: "2026-08-18 10:00:00",
  title: "歯医者",
};

test("外部予定の題名・時間・カレンダー名が見え、削除は確認を挟んで Google 側に送る", async () => {
  const onRemove = vi.fn().mockResolvedValue(Result.ok(null));
  const onClose = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <BoardScheduleExternalModal
      onUpdate={vi.fn()}
      external={EXTERNAL}
      onClose={onClose}
      onRemove={onRemove}
    />,
  );

  expect(getByRole("textbox", { name: "件名" }).getAttribute("value")).toBe("歯医者");
  expect(getByText("owner@example.com")).toBeDefined();
  expect(getByText("仕事")).toBeDefined();

  const removeButton = getByRole("button", { name: "削除" });
  removeButton.focus();
  await vi.waitFor(() =>
    expect(getByRole("tooltip").textContent).toBe("Google カレンダー上の予定も削除されます"),
  );
  fireEvent.click(removeButton);
  const confirm = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: /削除しますか/ }),
  );
  fireEvent.click(within(confirm).getByRole("button", { hidden: true, name: "削除" }));

  await vi.waitFor(() => {
    expect(onRemove).toHaveBeenCalledWith(EXTERNAL._id);
  });
  expect(onClose).toHaveBeenCalled();
});

test("モバイルではドラッグの案内を出さない", () => {
  const { getByText, queryByText } = renderWithMantine(
    <BoardScheduleExternalModal
      onUpdate={vi.fn()}
      external={EXTERNAL}
      onClose={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  expect(queryByText(/ドラッグで動かす/)).toBeNull();
  expect(getByText(/Google カレンダー上の予定も変更・削除/)).toBeDefined();
});

test("読み取り専用の予定は削除できずドラッグの案内も出さない", () => {
  const onRemove = vi.fn();
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <BoardScheduleExternalModal
      onUpdate={vi.fn()}
      external={{ ...EXTERNAL, canEdit: false }}
      onClose={vi.fn()}
      onRemove={onRemove}
    />,
  );
  const removeButton = getByRole("button", { name: "削除" });
  expect(removeButton.hasAttribute("disabled")).toBe(true);
  fireEvent.click(removeButton);
  expect(onRemove).not.toHaveBeenCalled();
  expect(queryByText(/ドラッグで動かす/)).toBeNull();
  expect(getByText(/読み取り専用のカレンダーです/)).toBeDefined();
});

test("外部予定の削除に失敗したら詳細画面を閉じない", async () => {
  const onClose = vi.fn();
  const onRemove = vi.fn(async () =>
    Result.err(new MutationFailedError({ cause: new Error("offline"), message: "削除失敗" })),
  );
  const { getByRole } = renderWithMantine(
    <BoardScheduleExternalModal
      onUpdate={vi.fn()}
      external={EXTERNAL}
      onClose={onClose}
      onRemove={onRemove}
    />,
  );
  fireEvent.click(getByRole("button", { name: "削除" }));
  const confirm = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: /削除しますか/ }),
  );
  fireEvent.click(within(confirm).getByRole("button", { hidden: true, name: "削除" }));
  await vi.waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
  expect(onClose).not.toHaveBeenCalled();
  expect(getByRole("textbox", { name: "件名" }).getAttribute("value")).toBe("歯医者");
});

test("件名・色を同じフォームで編集し、失敗時には入力を残す", async () => {
  const onClose = vi.fn();
  const onUpdate = vi
    .fn()
    .mockResolvedValue(
      Result.err(new MutationFailedError({ cause: new Error("offline"), message: "失敗" })),
    );
  const view = renderWithMantine(
    <BoardScheduleExternalModal
      external={EXTERNAL}
      onClose={onClose}
      onRemove={vi.fn()}
      onUpdate={onUpdate}
    />,
  );
  fireEvent.change(view.getByRole("textbox", { name: "件名" }), { target: { value: "定期検診" } });
  fireEvent.click(view.getByRole("combobox", { name: "色" }));
  fireEvent.click(await view.findByRole("option", { name: "トマト" }));
  fireEvent.submit(
    view.getByRole("button", { name: "保存" }).closest('[role="dialog"]')?.querySelector("form") ??
      document.body,
  );
  await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
  expect(onUpdate.mock.calls[0]?.[0]).toMatchObject({ title: "定期検診", colorId: "11" });
  expect(onClose).not.toHaveBeenCalled();
});
