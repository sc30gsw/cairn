import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { planDayScheduleEntries } from "~/features/plan/lib/plan-day-schedule-entries";
import { NONE_ITEM_VALUE } from "~/features/plan/schemas/plan-template-schema";
import type { PlanCatalogItem, PlanEventDto, PlanExternalEvent } from "~/features/plan/types/plan";

const item = {
  _id: "item-1",
  categoryId: "cat-1",
  name: "多読",
  sortOrder: 0,
} as PlanCatalogItem;

const events: PlanEventDto[] = [
  {
    _id: "event-2" as Id<"planEvents">,
    dateJst: "2026-08-17",
    endTime: "10:00",
    priority: "low",
    recordState: { kind: "not-applicable" },
    startTime: "09:30",
    title: "後の予定",
  },
  {
    _id: "event-1" as Id<"planEvents">,
    dateJst: "2026-08-17",
    endTime: "09:00",
    itemId: item._id,
    priority: "high",
    recordState: { kind: "awaiting-open" },
    startTime: "07:00",
    title: "",
  },
];

const externals: PlanExternalEvent[] = [
  {
    _id: "ext-1" as Id<"externalCalendarEvents">,
    allDay: false,
    calendarEmail: null,
    calendarId: "cal-1",
    calendarName: "仕事",
    canEdit: false,
    color: null,
    colorId: "5",
    endAt: "2026-08-17 12:00:00",
    externalReadOnly: true,
    meetingUrl: null,
    startAt: "2026-08-17 11:00:00",
    title: "MTG",
  },
];

test("開始時刻順に並べ、項目名と外部ラベルを出す", () => {
  const entries = planDayScheduleEntries({
    dateJst: "2026-08-17",
    events,
    externals,
    items: [item],
  });

  expect(entries.map((entry) => entry.startTime)).toEqual(["07:00", "09:30", "11:00"]);
  expect(entries[0]?.name).toBe("多読");
  expect(entries[2]?.external).toBe(true);
  expect(entries[2]?.name).toContain("（外部）");
});

test("プリセット編集中の下書き行を強調する", () => {
  const entries = planDayScheduleEntries({
    dateJst: "2026-08-17",
    draftTemplateEvents: [
      {
        endTime: "08:00",
        itemId: NONE_ITEM_VALUE,
        priority: "medium",
        startTime: "07:30",
        title: "下書き",
      },
    ],
    events: [],
    externals: [],
    items: [item],
  });

  expect(entries).toHaveLength(1);
  expect(entries[0]?.draft).toBe(true);
  expect(entries[0]?.name).toBe("下書き");
});
