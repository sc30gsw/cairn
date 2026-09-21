import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanClock } from "~/features/plan/components/plan-clock";
import type { PlanEventDto } from "~/features/plan/types/plan";
import { renderWithMantine } from "~/test-utils/render";

function clockFace(view: ReturnType<typeof renderWithMantine>): SVGSVGElement {
  const face = view.container.querySelector("svg");
  if (!(face instanceof SVGSVGElement)) {
    throw new Error("Clock face missing");
  }
  return face;
}

const confirmed: PlanEventDto = {
  _id: "arc-1" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "08:15",
  itemId: "item-1" as Id<"items">,
  priority: "high",
  recordState: { kind: "materialized", status: "確定" },
  startTime: "07:00",
  title: "英語",
};

const idle: PlanEventDto = {
  _id: "idle-1" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "21:00",
  priority: "low",
  recordState: { kind: "not-applicable" },
  startTime: "20:00",
  title: "X を見る",
};

test("Clock は確定した項目つき予定の弧と、予定外の確定分数を出す", () => {
  const view = renderWithMantine(
    <PlanClock
      events={[confirmed, idle]}
      now={new Date("2026-09-21T20:00:00.000Z")}
      selectedDateJst="2026-09-21"
      todayJst="2026-09-21"
      unplannedConfirmedMinutes={40}
    />,
  );

  expect(clockFace(view).querySelectorAll("path")).toHaveLength(1);
  expect(view.getByText("予定に載らない確定 40分")).toBeDefined();
  expect(view.getByText("高（Banana）")).toBeDefined();
  expect(clockFace(view).querySelectorAll("line")).toHaveLength(5);
});

test("Clock は今日以外の針を出さない", () => {
  const view = renderWithMantine(
    <PlanClock
      events={[confirmed]}
      now={new Date("2026-09-21T20:00:00.000Z")}
      selectedDateJst="2026-09-25"
      todayJst="2026-09-21"
      unplannedConfirmedMinutes={0}
    />,
  );

  expect(clockFace(view).querySelectorAll("line")).toHaveLength(4);
});
