import { SEARCH_QUERY_MIN_LENGTH, SEARCH_QUERY_TOO_SHORT_MESSAGE } from "./domain";
import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

//? 日本語は分かち書きが無いので、正規化した文字列の部分一致で探す（docs/research/convex-search-japanese.md 案 c）
//? NFKC で全角英数・半角カナ・互換文字を揃え、大文字小文字を畳む
export function normalizeSearchText(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

export function normalizeSearchQuery(query: string): string {
  return normalizeSearchText(query).trim();
}

export function isSearchableQuery(query: string): boolean {
  return normalizeSearchQuery(query).length >= SEARCH_QUERY_MIN_LENGTH;
}

export function requireSearchQuery(query: string): string {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < SEARCH_QUERY_MIN_LENGTH) {
    throwDomain(new ValidationFailedError({ message: SEARCH_QUERY_TOO_SHORT_MESSAGE }));
  }
  return normalized;
}

export function matchesSearchText(text: string, normalizedQuery: string): boolean {
  return normalizedQuery.length > 0 && normalizeSearchText(text).includes(normalizedQuery);
}

//? 元の文字列上の一致位置。正規化で文字数が変わる（合字など）場合は位置を保証できないので null
export function searchMatchRange(
  text: string,
  normalizedQuery: string,
): Record<"end" | "start", number> | null {
  if (normalizedQuery.length === 0) {
    return null;
  }
  const normalized = normalizeSearchText(text);
  const start = normalized.indexOf(normalizedQuery);
  if (start < 0 || normalized.length !== text.length) {
    return null;
  }
  return { end: start + normalizedQuery.length, start };
}
