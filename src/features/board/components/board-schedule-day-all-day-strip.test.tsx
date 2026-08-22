import { describe, expect, test, vi } from "vite-plus/test";

import { BoardScheduleDayAllDayStrip } from "~/features/board/components/board-schedule-day-all-day-strip";
import { renderWithMantine } from "~/test-utils/render";

describe("BoardScheduleDayAllDayStrip", () => {
  test("more ボタンで onMoreClick が呼ばれる", () => {
    const onMoreClick = vi.fn();
    const onEventClick = vi.fn();

    const { getByRole } = renderWithMantine(
      <BoardScheduleDayAllDayStrip
        events={[
          {
            color: "blue",
            end: "2026-08-22 23:59:59",
            id: "1",
            start: "2026-08-22 00:00:00",
            title: "A",
          },
          {
            color: "green",
            end: "2026-08-22 23:59:59",
            id: "2",
            start: "2026-08-22 00:00:00",
            title: "B",
          },
          {
            color: "red",
            end: "2026-08-22 23:59:59",
            id: "3",
            start: "2026-08-22 00:00:00",
            title: "C",
          },
        ]}
        limit={2}
        moreLabel={(count) => `+${count}件`}
        onEventClick={onEventClick}
        onMoreClick={onMoreClick}
      />,
    );

    getByRole("button", { name: "+1件" }).click();

    expect(onMoreClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).not.toHaveBeenCalled();
  });
});
