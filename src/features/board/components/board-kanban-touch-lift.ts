import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { TouchEvent as ReactTouchEvent } from "react";

export const KANBAN_TOUCH_LIFT_MS = 120;

type RuntimeHandleProps = DraggableProvidedDragHandleProps & {
  onTouchStart?: (event: ReactTouchEvent<HTMLElement>) => void;
};

const moveListener = { capture: true, passive: false } as const satisfies AddEventListenerOptions;

export function guardKanbanTouchLift(handle: HTMLElement) {
  const onMove = (event: TouchEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  handle.addEventListener("touchmove", onMove, moveListener);
  const liftTimer = window.setTimeout(() => {
    handle.removeEventListener("touchmove", onMove, moveListener);
  }, KANBAN_TOUCH_LIFT_MS);
  const stop = () => {
    window.clearTimeout(liftTimer);
    handle.removeEventListener("touchmove", onMove, moveListener);
    handle.removeEventListener("touchend", stop);
    handle.removeEventListener("touchcancel", stop);
  };
  handle.addEventListener("touchend", stop);
  handle.addEventListener("touchcancel", stop);
}

export function withKanbanTouchLift(
  handleProps: DraggableProvidedDragHandleProps | null | undefined,
) {
  if (handleProps == null) {
    return undefined;
  }
  const runtime: RuntimeHandleProps = handleProps;
  return {
    ...runtime,
    style: { touchAction: "none" },
    onTouchStart(event: ReactTouchEvent<HTMLElement>) {
      runtime.onTouchStart?.(event);
      guardKanbanTouchLift(event.currentTarget);
    },
  };
}
