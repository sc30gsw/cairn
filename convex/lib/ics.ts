import { addDaysJst } from "./jst";

//? iCalendar（RFC 5545）の最小構成。終日イベントだけを扱う（本番日・チェックポイント期限は時刻を持たない）
export const ICS_PRODID = "-//cairn//Study Log//JA";
export const ICS_CALENDAR_NAME = "学習ログ（本番日とチェックポイント）";
export const ICS_UID_DOMAIN = "cairn";
//? RFC 7986 REFRESH-INTERVAL は提案値。各カレンダーのポーリング間隔を縛るものではない
export const ICS_REFRESH_INTERVAL = "P1D";
export const ICS_LINE_LIMIT = 75;

export type IcsAllDayEvent = {
  dateJst: string;
  description?: string;
  summary: string;
  uid: string;
};

//? RFC 5545 §3.3.11: バックスラッシュ・セミコロン・カンマ・改行をエスケープ
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

//? RFC 5545 §3.1: 75 オクテットで折り返し、続きの行は空白1つで始める。UTF-8 の文字を途中で切らない
export function foldIcsLine(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = lines.length === 0 ? ICS_LINE_LIMIT : ICS_LINE_LIMIT - 1;
    if (currentBytes + bytes > limit) {
      lines.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  lines.push(current);
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`));
}

export function icsDate(dateJst: string): string {
  return dateJst.replaceAll("-", "");
}

export function icsTimestamp(nowMs: number): string {
  return new Date(nowMs)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function allDayEventLines(event: IcsAllDayEvent, stamp: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}@${ICS_UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(event.dateJst)}`,
    //? DTEND は排他的終端（RFC 5545 §3.6.1）。1日の終日イベントは翌日を指す
    `DTEND;VALUE=DATE:${icsDate(addDaysJst(event.dateJst, 1))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description !== undefined && event.description !== "") {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  return lines;
}

//? METHOD は付けない（スナップショットの配信。RFC 5545 §3.7.2）。改行は CRLF
export function buildIcs(events: readonly IcsAllDayEvent[], nowMs: number): string {
  const stamp = icsTimestamp(nowMs);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PRODID}`,
    "CALSCALE:GREGORIAN",
    `NAME:${escapeIcsText(ICS_CALENDAR_NAME)}`,
    `X-WR-CALNAME:${escapeIcsText(ICS_CALENDAR_NAME)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${ICS_REFRESH_INTERVAL}`,
    ...events.flatMap((event) => allDayEventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(foldIcsLine).join("\r\n")}\r\n`;
}
