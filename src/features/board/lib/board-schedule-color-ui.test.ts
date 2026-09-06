import { expect, test } from "vite-plus/test";
import { boardScheduleGoogleColor } from "~domain/boardScheduleColors";
import {
  GOOGLE_CALENDAR_EVENT_COLORS,
  googleCalendarEventColor,
} from "~domain/googleCalendarColors";

import { boardScheduleColorCss } from "~/features/board/lib/board-schedule-color-ui";

test.each(GOOGLE_CALENDAR_EVENT_COLORS)(
  "$label は通常予定とGoogle予定で同じ色と送信IDを使う",
  ({ appColor, id, color }) => {
    expect(boardScheduleColorCss(appColor)).toBe(color);
    expect(googleCalendarEventColor(id)).toBe(color);
    expect(boardScheduleGoogleColor(appColor).id).toBe(id);
  },
);

test("既存のtealとvioletも以前と同じGoogle色に対応する", () => {
  expect(boardScheduleGoogleColor("teal").id).toBe("7");
  expect(boardScheduleGoogleColor("violet").id).toBe("3");
  expect(boardScheduleColorCss("blue")).toBe("#5484ed");
  expect(boardScheduleColorCss("grape")).toBe("#dbadff");
});
