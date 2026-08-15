#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const EXCLUDE = new Set([
  "convex/lib/domain.ts",
  "convex/lib/validators.ts",
  "scripts/type-ssot-check.mjs",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".pnpm-store",
  ".tanstack",
  "dist",
  "node_modules",
]);

const pattern =
  /("スキップ"\s*\|\s*"未着手"\s*\|\s*"確定"|"確定"\s*\|\s*"未着手"\s*\|\s*"スキップ"|type\s+\w*Status\w*\s*=\s*")/;

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
    if (pattern.test(line)) {
      violations.push(`${rel}:${index + 1}:${line.trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error("手書き status union が見つかりました:\n");
  console.error(violations.join("\n"));
  console.error(
    "\n型 SSoT 違反: status union は convex/lib/domain.ts の STATUSES から導出してください。",
  );
  process.exit(1);
}

console.log("type-ssot-check: OK");
