import { SEARCH_QUERY_MIN_LENGTH, SEARCH_QUERY_TOO_SHORT_MESSAGE } from "./domain";
import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

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
