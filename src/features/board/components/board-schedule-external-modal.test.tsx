import { fireEvent, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { BoardScheduleExternalModal } from "~/features/board/components/board-schedule-external-modal";
import type { BoardExternalEvent } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const EXTERNAL: BoardExternalEvent = {
  _id: "ext1" as Id<"externalCalendarEvents">,
  allDay: false,
  calendarId: "owner@example.com",
  calendarName: "仕事",
  color: "#9fe1cb",
  endAt: "2026-08-18 11:00:00",
  startAt: "2026-08-18 10:00:00",
  title: "歯医者",
};

test("外部予定の題名・時間・カレンダー名が見え、削除は確認を挟んで Google 側に送る", async () => {
  const onRemove = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const { getByRole, getByText } = renderWithMantine(
    <BoardScheduleExternalModal
      canDrag
      external={EXTERNAL}
      onClose={onClose}
      onRemove={onRemove}
    />,
  );

  expect(getByText("歯医者")).toBeDefined();
  expect(getByText("2026-08-18 10:00 〜 11:00")).toBeDefined();
  expect(getByText("仕事")).toBeDefined();

  fireEvent.click(getByRole("button", { name: "Google カレンダーから削除" }));
  //? 確認ダイアログの確定ボタンは元のボタンと同じ名前なので、探す範囲をダイアログ内に限る
  const confirm = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: /削除しますか/ }),
  );
  fireEvent.click(
    within(confirm).getByRole("button", { hidden: true, name: "Google カレンダーから削除" }),
  );

  await vi.waitFor(() => {
    expect(onRemove).toHaveBeenCalledWith(EXTERNAL._id);
  });
  expect(onClose).toHaveBeenCalled();
});

test("モバイルではドラッグの案内を出さない", () => {
  const { getByText, queryByText } = renderWithMantine(
    <BoardScheduleExternalModal
      canDrag={false}
      external={EXTERNAL}
      onClose={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  expect(queryByText(/ドラッグで動かす/)).toBeNull();
  expect(getByText(/Google カレンダーで行ってください/)).toBeDefined();
});
