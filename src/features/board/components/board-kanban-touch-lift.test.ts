import { afterEach, expect, test, vi } from "vite-plus/test";

import {
  guardKanbanTouchLift,
  KANBAN_TOUCH_LIFT_MS,
} from "~/features/board/components/board-kanban-touch-lift";

afterEach(() => {
  vi.useRealTimers();
});

test("lift 前の touchmove は後から付いた listener に届かない", () => {
  const handle = document.createElement("div");
  document.body.append(handle);
  const later = vi.fn();
  guardKanbanTouchLift(handle);
  handle.addEventListener("touchmove", later);

  handle.dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true }));

  expect(later).not.toHaveBeenCalled();
  handle.remove();
});

test("lift 後の touchmove は後から付いた listener に届く", () => {
  vi.useFakeTimers();
  const handle = document.createElement("div");
  document.body.append(handle);
  const later = vi.fn();
  guardKanbanTouchLift(handle);
  handle.addEventListener("touchmove", later);

  vi.advanceTimersByTime(KANBAN_TOUCH_LIFT_MS);
  handle.dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true }));

  expect(later).toHaveBeenCalledOnce();
  handle.remove();
});
