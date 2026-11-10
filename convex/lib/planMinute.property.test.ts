import { expect, test } from "vite-plus/test";

import {
  parseMinuteOfDay,
  parsePlanWindow,
  PLAN_TIME_MESSAGE,
  PLAN_WINDOW_MESSAGE,
} from "./planEvent";

function clock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

test("時刻は 00:00 から 23:59 だけを分にし、終了の 24:00 だけを 1440 にし、終了が開始以前なら窓を拒否する", () => {
  for (let hour = 0; hour <= 23; hour += 1) {
    for (const minute of [0, 1, 30, 59]) {
      const text = clock(hour, minute);
      const minuteOfDay = hour * 60 + minute;
      expect(parseMinuteOfDay(text, "start"), text).toBe(minuteOfDay);
      expect(parseMinuteOfDay(text, "end"), text).toBe(minuteOfDay);
    }
    for (const minute of [60, 61, 99]) {
      const text = clock(hour, minute);
      expect(() => parseMinuteOfDay(text, "start"), text).toThrow(PLAN_TIME_MESSAGE);
      expect(() => parseMinuteOfDay(text, "end"), text).toThrow(PLAN_TIME_MESSAGE);
    }
  }

  expect(parseMinuteOfDay("24:00", "end")).toBe(1440);
  for (const role of ["start", "end"] as const) {
    expect(() => parseMinuteOfDay("24:01", role)).toThrow(PLAN_TIME_MESSAGE);
    expect(() => parseMinuteOfDay("25:00", role)).toThrow(PLAN_TIME_MESSAGE);
    expect(() => parseMinuteOfDay("ab:cd", role)).toThrow(PLAN_TIME_MESSAGE);
  }
  expect(() => parseMinuteOfDay("24:00", "start")).toThrow(PLAN_TIME_MESSAGE);

  for (let hour = 0; hour <= 22; hour += 1) {
    expect(parsePlanWindow({ endTime: clock(hour + 1, 0), startTime: clock(hour, 0) })).toEqual({
      endMinute: (hour + 1) * 60,
      startMinute: hour * 60,
    });
    const same = clock(hour, 0);
    expect(() => parsePlanWindow({ endTime: same, startTime: same })).toThrow(PLAN_WINDOW_MESSAGE);
    expect(() =>
      parsePlanWindow({ endTime: clock(hour, 0), startTime: clock(hour + 1, 0) }),
    ).toThrow(PLAN_WINDOW_MESSAGE);
  }
  expect(parsePlanWindow({ endTime: "24:00", startTime: "23:59" })).toEqual({
    endMinute: 1440,
    startMinute: 23 * 60 + 59,
  });
  expect(() => parsePlanWindow({ endTime: "24:00", startTime: "24:00" })).toThrow(
    PLAN_TIME_MESSAGE,
  );
});
