import { Button } from "@mantine/core";
import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { BoardScheduleEventSource } from "~/features/board/components/board-schedule-event-source";
import { renderWithMantine } from "~/test-utils/render";

test("Google予定はタイトルと操作を保ち、フォーカスで連携元を説明する", async () => {
  const onClick = vi.fn();
  const { getByRole, findByRole } = renderWithMantine(
    <BoardScheduleEventSource eventId="external:event|2026-09-06">
      <Button onClick={onClick} className="original">
        英語のレッスン
      </Button>
    </BoardScheduleEventSource>,
  );
  const button = getByRole("button", { name: "英語のレッスン" });
  expect(button.dataset.googleCalendarEvent).toBe("true");
  expect(button.classList.contains("original")).toBe(true);
  button.focus();
  expect((await findByRole("tooltip")).textContent).toBe("Google カレンダーの予定");
  fireEvent.click(button);
  await waitFor(() => expect(onClick).toHaveBeenCalledOnce());
});

test("通常予定にはGoogleの装飾や説明を付けない", () => {
  const { getByRole } = renderWithMantine(
    <BoardScheduleEventSource eventId="app-event">
      <Button>自主学習</Button>
    </BoardScheduleEventSource>,
  );
  expect(getByRole("button").hasAttribute("data-google-calendar-event")).toBe(false);
  expect(getByRole("button").hasAttribute("aria-description")).toBe(false);
});
