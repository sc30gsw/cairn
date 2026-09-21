import { describe, expect, test } from "vite-plus/test";

import {
  createAuthPublicConfigCollection,
  createDayPageCollection,
  createExternalCalendarEventsCollection,
  createHistorySearchCollection,
  createPlanEventsCollection,
  createPlanTemplatesCollection,
  createPlanWindowCollection,
  createSetupStatusCollection,
} from "~/lib/tanstack-db/collections";

describe("TanStack DB collection descriptors", () => {
  test("keeps each Convex query scope in its collection identity", () => {
    expect(createDayPageCollection({ dateJst: "2026-09-10", todayJst: "2026-09-10" }).id).toBe(
      "day-page:2026-09-10:2026-09-10",
    );
    expect(
      createExternalCalendarEventsCollection({ anchorDateJst: "2026-09-07", view: "week" }).id,
    ).toBe("external-calendar-events:2026-09-07:week");
    expect(createPlanEventsCollection({ anchorDateJst: "2026-09-21", view: "day" }).id).toBe(
      "plan-events:2026-09-21:day",
    );
    expect(createPlanWindowCollection({ anchorDateJst: "2026-09-21", view: "day" }).id).toBe(
      "plan-window:2026-09-21:day",
    );
    expect(createPlanTemplatesCollection().id).toBe("plan-templates");
  });

  test("keeps dynamic auxiliary query arguments in stable identities", () => {
    expect(createHistorySearchCollection({ fromJst: "2026-09-01", query: "復習" }).id).toBe(
      'history-search:[["fromJst","2026-09-01"],["query","復習"]]',
    );
    expect(createHistorySearchCollection({ query: "復習", fromJst: "2026-09-01" }).id).toBe(
      'history-search:[["fromJst","2026-09-01"],["query","復習"]]',
    );
    expect(createAuthPublicConfigCollection().id).toBe("auth-public-config");
    expect(createSetupStatusCollection().id).toBe("setup-status");
  });
});
