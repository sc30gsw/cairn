import { expect, test } from "vite-plus/test";

import { deriveHistoryView } from "~/features/history/hooks/use-history-view";

test("deriveHistoryView は未指定時に today から補完する", () => {
  const view = deriveHistoryView({}, "2026-08-17");
  expect(view.tab).toBe("month");
  expect(view.selectedDateJst).toBe("2026-08-17");
  expect(view.analysisScope).toBe("day");
  expect(view.yearMonth).toBe("2026-08");
  expect(view.weekAnchor).toBe("2026-08-17");
});

test("deriveHistoryView は search を優先する", () => {
  const view = deriveHistoryView(
    {
      date: "2026-08-01",
      month: "2026-07",
      scope: "week",
      tab: "analysis",
      week: "2026-07-28",
    },
    "2026-08-17",
  );
  expect(view.tab).toBe("analysis");
  expect(view.selectedDateJst).toBe("2026-08-01");
  expect(view.analysisScope).toBe("week");
  expect(view.yearMonth).toBe("2026-07");
  expect(view.weekAnchor).toBe("2026-07-28");
});

test("deriveHistoryView の week 省略時は date の月曜", () => {
  const view = deriveHistoryView({ date: "2026-08-20" }, "2026-08-17");
  expect(view.weekAnchor).toBe("2026-08-17");
});
