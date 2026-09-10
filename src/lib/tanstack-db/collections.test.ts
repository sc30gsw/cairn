import { describe, expect, test } from "vite-plus/test";

import {
  createBoardScheduleBlocksCollection,
  createDayPageCollection,
  createDayRowsCollection,
  createExternalCalendarEventsCollection,
} from "~/lib/tanstack-db/collections";

describe("TanStack DB collection descriptors", () => {
  test("keeps each Convex query scope in its collection identity", () => {
    expect(createDayRowsCollection({ dateJst: "2026-09-10", todayJst: "2026-09-10" }).id).toBe(
      "day-rows:2026-09-10:2026-09-10",
    );
    expect(
      createDayRowsCollection({
        dateJst: "2026-09-10",
        syncMode: "on-demand",
        todayJst: "2026-09-10",
      }).id,
    ).toBe("day-rows:2026-09-10:2026-09-10:on-demand");
    expect(createDayPageCollection({ dateJst: "2026-09-10", todayJst: "2026-09-10" }).id).toBe(
      "day-page:2026-09-10:2026-09-10",
    );
    expect(
      createBoardScheduleBlocksCollection({ anchorDateJst: "2026-09-07", view: "week" }).id,
    ).toBe("board-schedule-blocks:2026-09-07:week");
    expect(
      createExternalCalendarEventsCollection({ anchorDateJst: "2026-09-07", view: "week" }).id,
    ).toBe("external-calendar-events:2026-09-07:week");
  });
});
