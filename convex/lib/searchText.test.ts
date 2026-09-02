import { expect, test } from "vite-plus/test";

import { SEARCH_QUERY_TOO_SHORT_MESSAGE } from "./domain";
import {
  isSearchableQuery,
  matchesSearchText,
  normalizeSearchQuery,
  requireSearchQuery,
  searchMatchRange,
} from "./searchText";

test("正規化は NFKC と小文字化: 全角英数・半角カナ・大文字を揃える", () => {
  expect(normalizeSearchQuery(" ＴＯＥＩＣ ")).toBe("toeic");
  expect(normalizeSearchQuery("ｵﾝﾄﾞｸ")).toBe("オンドク");
  expect(normalizeSearchQuery("Part５")).toBe("part5");
});

test("2文字未満は検索しない。requireSearchQuery はドメインの文言で throw", () => {
  expect(isSearchableQuery("音")).toBe(false);
  expect(isSearchableQuery(" 音 ")).toBe(false);
  expect(isSearchableQuery("音読")).toBe(true);
  expect(() => requireSearchQuery("a")).toThrow(SEARCH_QUERY_TOO_SHORT_MESSAGE);
  expect(requireSearchQuery("  Part5 ")).toBe("part5");
});

test("部分一致は文の途中でも、表記が違っても当たる", () => {
  expect(matchesSearchText("今日は金フレの音読を30分", "音読")).toBe(true);
  expect(matchesSearchText("TOEIC Part5 を10問", normalizeSearchQuery("ｐａｒｔ５"))).toBe(true);
  expect(matchesSearchText("シャドーイング", "音読")).toBe(false);
  expect(matchesSearchText("音読", "")).toBe(false);
});

test("一致位置は元の文字列のインデックスで返し、文字数が変わる正規化では null", () => {
  expect(searchMatchRange("今日は金フレの音読を30分", "音読")).toEqual({ end: 9, start: 7 });
  expect(searchMatchRange("TOEIC Part5", "part5")).toEqual({ end: 11, start: 6 });
  expect(searchMatchRange("音読", "読書")).toBeNull();
  //? "㍻"(平成の合字)は NFKC で2文字に展開され、位置がずれるので保証しない
  expect(searchMatchRange("㍻の音読", "音読")).toBeNull();
});
