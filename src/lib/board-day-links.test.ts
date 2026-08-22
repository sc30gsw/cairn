import { expect, test } from "vite-plus/test";

import {
  boardKanbanLink,
  boardKanbanLinkLabel,
  dayEditLinkLabel,
  dayPageLink,
} from "~/lib/board-day-links";

test("今日はホームとカンバン既定リンク", () => {
  expect(dayPageLink("2026-08-17", "2026-08-17")).toEqual({ to: "/" });
  expect(boardKanbanLink("2026-08-17", "2026-08-17")).toEqual({
    search: { tab: "kanban" },
    to: "/board",
  });
});

test("過去日は dated route と date search", () => {
  expect(dayPageLink("2026-08-15", "2026-08-17")).toEqual({
    params: { dateJst: "2026-08-15" },
    to: "/days/$dateJst",
  });
  expect(boardKanbanLink("2026-08-15", "2026-08-17")).toEqual({
    search: { date: "2026-08-15", tab: "kanban" },
    to: "/board",
  });
});

test("相互リンクのラベル", () => {
  expect(dayEditLinkLabel("2026-08-15")).toBe("2026-08-15 の記録を編集する");
  expect(boardKanbanLinkLabel("2026-08-15")).toBe("2026-08-15 の記録をカンバンで見る");
});
