#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const EXCLUDE = new Set([
  "convex/lib/domain.ts",
  "convex/lib/validators.ts",
  "scripts/type-ssot-check.mjs",
]);

const SKIP_DIRS = new Set([".git", ".pnpm-store", ".tanstack", "dist", "node_modules"]);

const patterns = [
  {
    name: "手書き status union",
    regex:
      /("スキップ"\s*\|\s*"未着手"\s*\|\s*"確定"|"確定"\s*\|\s*"未着手"\s*\|\s*"スキップ"|type\s+\w*Status\w*\s*=\s*")/,
    hint: "status union は convex/lib/domain.ts の STATUSES から導出してください。",
  },
  {
    name: "重複 AppShellUser 定義",
    regex: /type\s+AppShellUser\s*=\s*\{/,
    onlyOutside: "src/types/session.ts",
    hint: "AppShellUser は src/types/session.ts から import してください。",
  },
  {
    name: "重複 AnalysisScope 定義",
    regex: /type\s+AnalysisScope\s*=\s*"/,
    onlyOutside: "src/features/history/schemas/analysis-scope-schema.ts",
    hint: "AnalysisScope は analysis-scope-schema.ts から import してください。",
  },
  {
    name: "手書き condition union",
    regex: /"好調"\s*\|\s*"普通"\s*\|\s*"崩れた"/,
    hint: "condition union は ~domain/conditions の Condition を使ってください。",
  },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
      continue;
    }

    if (entry.isFile() && (path.endsWith(".ts") || path.endsWith(".tsx"))) {
      yield path;
    }
  }
}

const violations = [];

for await (const filePath of walk(ROOT)) {
  const rel = relative(ROOT, filePath).replaceAll("\\", "/");
  if (EXCLUDE.has(rel)) continue;

  const content = await readFile(filePath, "utf8");
  for (const [index, line] of content.split("\n").entries()) {
    for (const { name, regex, onlyOutside, hint } of patterns) {
      if (onlyOutside !== undefined && rel === onlyOutside) continue;
      if (regex.test(line)) {
        violations.push({ file: rel, hint, line: index + 1, name, text: line.trim() });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("型 SSoT 違反が見つかりました:\n");
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} [${violation.name}] ${violation.text}`);
    console.error(`  → ${violation.hint}\n`);
  }
  process.exit(1);
}

console.log("type-ssot-check: OK");
