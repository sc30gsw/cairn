import type { ScheduleEventData, ScheduleProps } from "@mantine/schedule";
import { expect, test, vi } from "vite-plus/test";

import { BoardSchedule } from "~/features/board/components/board-schedule";
import { deriveBoardView } from "~/features/board/hooks/use-board-view";
import type { BoardExternalEvent, BoardScheduleBlock } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const scheduleActions = vi.hoisted(() => ({
  onCreateBlock: vi.fn(),
  onMoveBlock: vi.fn(),
  onMoveExternal: vi.fn(),
  onRemoveBlock: vi.fn(),
  onRemoveExternal: vi.fn(),
  onUpdateBlock: vi.fn(),
}));

let latestScheduleProps: ScheduleProps | null = null;

vi.mock("@mantine/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/schedule")>();
  return {
    ...actual,
    Schedule: (props: ScheduleProps) => {
      latestScheduleProps = props;
      return null;
    },
  };
});

vi.mock("~/features/board/hooks/use-board-schedule-actions", () => ({
  useBoardScheduleActions: () => scheduleActions,
}));

const block: BoardScheduleBlock = {
  _id: "block-1" as BoardScheduleBlock["_id"],
  color: "orange",
  endAt: "2026-09-23 11:00:00",
  rowId: "row-1" as BoardScheduleBlock["rowId"],
  startAt: "2026-09-23 10:00:00",
  title: "読書",
};

const external: BoardExternalEvent = {
  _id: "external-1" as BoardExternalEvent["_id"],
  allDay: false,
  calendarId: "calendar-1",
  calendarName: "仕事",
  calendarEmail: "owner@example.com",
  colorId: null,
  canEdit: true,
  color: "blue",
  externalReadOnly: false,
  meetingUrl: null,
  startAt: "2026-09-23 13:00:00",
  endAt: "2026-09-23 14:00:00",
  title: "打ち合わせ",
};

function renderSchedule(blocks: readonly BoardScheduleBlock[] = [block], pending = false) {
  renderWithMantine(
    <BoardSchedule
      blocks={blocks}
      externals={[external]}
      pending={pending}
      rows={[]}
      view={{
        ...deriveBoardView({ date: "2026-09-23", view: "week", tab: "schedule" }, "2026-09-30"),
        today: "2026-09-30",
        resetMonthViewToToday: vi.fn(),
        setDate: vi.fn(),
        setMonth: vi.fn(),
        setScheduleView: vi.fn(),
        setTab: vi.fn(),
        setWeek: vi.fn(),
      }}
    />,
  );
}

function scheduleEvent(id: string, start: string, end: string): ScheduleEventData {
  return { color: "orange", end, id, start, title: "予定" };
}

test("日週表示は移動とリサイズを15分刻みにする", () => {
  renderSchedule();

  expect(latestScheduleProps?.weekViewProps).toMatchObject({
    eventDragInterval: 15,
    eventResizeInterval: 15,
  });
  expect(latestScheduleProps?.withEventResize).toBe(true);
});

test("ブロックのリサイズは新しい開始・終了時刻を保存する", () => {
  renderSchedule();

  latestScheduleProps?.onEventResize?.({
    event: scheduleEvent(block._id, block.startAt, block.endAt),
    eventId: block._id,
    newEnd: "2026-09-23 11:30:00",
    newStart: "2026-09-23 09:45:00",
  });

  expect(scheduleActions.onMoveBlock).toHaveBeenCalledWith({
    blockId: block._id,
    endAt: "2026-09-23 11:30:00",
    startAt: "2026-09-23 09:45:00",
  });
});

test("編集可能な外部予定のリサイズは新しい範囲を保存する", () => {
  renderSchedule([]);

  latestScheduleProps?.onEventResize?.({
    event: scheduleEvent(`external:${external._id}`, external.startAt, external.endAt),
    eventId: `external:${external._id}`,
    newEnd: "2026-09-23 15:00:00",
    newStart: "2026-09-23 12:45:00",
  });

  expect(scheduleActions.onMoveExternal).toHaveBeenCalledWith({
    endAt: "2026-09-23 15:00:00",
    externalId: external._id,
    startAt: "2026-09-23 12:45:00",
  });
});

test("読み取り専用の外部予定はリサイズできない", () => {
  renderSchedule([]);
  const canResizeEvent = latestScheduleProps?.canResizeEvent;

  expect(
    canResizeEvent?.(
      scheduleEvent("external:read-only", "2026-09-23 13:00:00", "2026-09-23 14:00:00"),
    ),
  ).toBe(false);
});

test("読み込み中はリサイズと移動を無効にする", () => {
  renderSchedule([block], true);

  expect(latestScheduleProps?.withEventResize).toBe(false);
  expect(latestScheduleProps?.withEventsDragAndDrop).toBe(false);
  expect(
    latestScheduleProps?.canResizeEvent?.(scheduleEvent(block._id, block.startAt, block.endAt)),
  ).toBe(false);
});
