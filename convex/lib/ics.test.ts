import { expect, test } from "vite-plus/test";

import { buildIcs, escapeIcsText, foldIcsLine, ICS_PRODID, icsDate, icsTimestamp } from "./ics";

const NOW = Date.UTC(2026, 8, 2, 3, 4, 5);

test("テキストはバックスラッシュ・セミコロン・カンマ・改行をエスケープする", () => {
  expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
});

test("75 オクテットで折り返し、続きの行は空白で始め、多バイト文字を途中で切らない", () => {
  const short = foldIcsLine("SUMMARY:短い");
  expect(short).toEqual(["SUMMARY:短い"]);

  const long = foldIcsLine(`DESCRIPTION:${"あ".repeat(60)}`);
  expect(long.length).toBeGreaterThan(1);
  for (const [index, line] of long.entries()) {
    const bytes = new TextEncoder().encode(line).length;
    expect(bytes).toBeLessThanOrEqual(75);
    if (index > 0) {
      expect(line.startsWith(" ")).toBe(true);
    }
  }
  expect(long.map((line, index) => (index === 0 ? line : line.slice(1))).join("")).toBe(
    `DESCRIPTION:${"あ".repeat(60)}`,
  );
});

test("日付と時刻の書式", () => {
  expect(icsDate("2026-11-15")).toBe("20261115");
  expect(icsTimestamp(NOW)).toBe("20260902T030405Z");
});

test("終日イベントは VALUE=DATE で、DTEND は翌日（排他的終端）。必須プロパティが揃う", () => {
  const ics = buildIcs(
    [
      {
        dateJst: "2026-11-15",
        description: "目標 800〜900",
        summary: "本番: TOEIC",
        uid: "goal-exam",
      },
      { dateJst: "2026-09-30", summary: "期限: Unit 1-10, 音読", uid: "goal-cp" },
    ],
    NOW,
  );
  const lines = ics.split("\r\n");
  expect(lines[0]).toBe("BEGIN:VCALENDAR");
  expect(lines).toContain("VERSION:2.0");
  expect(lines).toContain(`PRODID:${ICS_PRODID}`);
  expect(lines).toContain("UID:goal-exam@cairn");
  expect(lines).toContain("DTSTAMP:20260902T030405Z");
  expect(lines).toContain("DTSTART;VALUE=DATE:20261115");
  expect(lines).toContain("DTEND;VALUE=DATE:20261116");
  expect(lines).toContain("DESCRIPTION:目標 800〜900");
  expect(lines).toContain("SUMMARY:期限: Unit 1-10\\, 音読");
  expect(lines).toContain("DTEND;VALUE=DATE:20261001");
  expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(2);
  expect(lines.some((line) => line.startsWith("METHOD:"))).toBe(false);
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
});

test("イベントが無くても妥当なカレンダーになる", () => {
  const ics = buildIcs([], NOW);
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).not.toContain("BEGIN:VEVENT");
});
