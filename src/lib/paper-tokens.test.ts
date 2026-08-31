import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vite-plus/test";

import { PAPER_TOKENS } from "~/lib/paper-tokens";
import { theme } from "~/lib/theme";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/manifest.webmanifest"), "utf8"),
) as Record<string, unknown>;

test("orangeAccent は theme の orange[5] と一致する", () => {
  expect(PAPER_TOKENS.orangeAccent).toBe(theme.colors?.orange?.[5]);
});

test("ink / paper は theme の black / white と一致する", () => {
  expect(theme.black).toBe(PAPER_TOKENS.ink);
  expect(theme.white).toBe(PAPER_TOKENS.paper);
});

test("desk は manifest の theme_color / background_color と一致する", () => {
  expect(manifest.theme_color).toBe(PAPER_TOKENS.desk);
  expect(manifest.background_color).toBe(PAPER_TOKENS.desk);
});
