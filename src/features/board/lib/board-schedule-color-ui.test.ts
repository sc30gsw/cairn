import { expect, test } from "vite-plus/test";

import { boardScheduleColorCss } from "~/features/board/lib/board-schedule-color-ui";

test("boardScheduleColorCss maps palette names to Mantine CSS variables", () => {
  expect(boardScheduleColorCss("blue")).toBe("var(--mantine-color-blue-6)");
  expect(boardScheduleColorCss("grape")).toBe("var(--mantine-color-grape-6)");
});
