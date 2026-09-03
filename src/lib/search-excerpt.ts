import { searchMatchRange } from "~domain/searchText";

export type SearchExcerpt = {
  after: string;
  before: string;
  match: string;
};

const EXCERPT_RADIUS = 24;
const ELLIPSIS = "…";

//? 一致箇所の前後だけを抜き出す。位置が取れない（正規化で文字数が変わる）ときは先頭から切る
export function searchExcerpt(
  text: string,
  normalizedQuery: string,
  radius: number = EXCERPT_RADIUS,
): SearchExcerpt {
  const range = searchMatchRange(text, normalizedQuery);
  if (range === null) {
    const head = text.slice(0, radius * 2);
    return { after: head.length < text.length ? ELLIPSIS : "", before: head, match: "" };
  }
  const beforeStart = Math.max(0, range.start - radius);
  const afterEnd = Math.min(text.length, range.end + radius);
  return {
    after: text.slice(range.end, afterEnd) + (afterEnd < text.length ? ELLIPSIS : ""),
    before: (beforeStart > 0 ? ELLIPSIS : "") + text.slice(beforeStart, range.start),
    match: text.slice(range.start, range.end),
  };
}
