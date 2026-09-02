import { expect, test } from "vite-plus/test";

import { searchExcerpt } from "~/features/history/lib/search-excerpt";

test("短い文はそのまま、一致だけを分ける", () => {
  expect(searchExcerpt("金フレの音読を30分", "音読")).toEqual({
    after: "を30分",
    before: "金フレの",
    match: "音読",
  });
});

test("長い文は一致の前後だけを残し、切った側に省略記号を付ける", () => {
  const text = `${"あ".repeat(40)}音読${"い".repeat(40)}`;
  const excerpt = searchExcerpt(text, "音読", 5);
  expect(excerpt).toEqual({ after: "いいいいい…", before: "…あああああ", match: "音読" });
});

test("表記の違いを越えて当たったときも元の綴りで返す", () => {
  expect(searchExcerpt("TOEIC Part５ 10問", "part5")).toEqual({
    after: " 10問",
    before: "TOEIC ",
    match: "Part５",
  });
});

test("位置が取れないときは先頭から切り、match は空", () => {
  expect(searchExcerpt("㍻の音読", "音読", 2)).toEqual({
    after: "",
    before: "㍻の音読",
    match: "",
  });
});
