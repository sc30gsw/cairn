import { expect, test } from "vite-plus/test";

import {
  calendarFeedPath,
  calendarFeedTokenFromPath,
  encodeBase64Url,
  generateCalendarFeedToken,
} from "./calendarFeedToken";

test("トークンは 43 文字の base64url で、毎回違う", () => {
  const first = generateCalendarFeedToken();
  const second = generateCalendarFeedToken();
  expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(first).not.toBe(second);
});

test("base64url はパディング無しで + / を使わない", () => {
  expect(encodeBase64Url(new Uint8Array([251, 255, 191]))).toBe("-_-_");
  expect(encodeBase64Url(new Uint8Array([1]))).toBe("AQ");
});

test("パスからトークンを取り出し、形が違えば null", () => {
  const token = generateCalendarFeedToken();
  expect(calendarFeedTokenFromPath(calendarFeedPath(token))).toBe(token);
  expect(calendarFeedTokenFromPath(`/calendar/${token}`)).toBeNull();
  expect(calendarFeedTokenFromPath("/calendar/short.ics")).toBeNull();
  expect(calendarFeedTokenFromPath(`/other/${token}.ics`)).toBeNull();
  expect(calendarFeedTokenFromPath(`/calendar/${token.slice(0, 42)}!.ics`)).toBeNull();
});
