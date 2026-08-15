#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const pattern =
  '("スキップ"\\s*\\|\\s*"未着手"\\s*\\|\\s*"確定"|"確定"\\s*\\|\\s*"未着手"\\s*\\|\\s*"スキップ"|type\\s+\\w*Status\\w*\\s*=\\s*")';

const result = spawnSync(
  "rg",
  [
    "-n",
    pattern,
    "--glob",
    "*.{ts,tsx}",
    "--glob",
    "!convex/lib/domain.ts",
    "--glob",
    "!convex/lib/validators.ts",
    "--glob",
    "!scripts/type-ssot-check.mjs",
  ],
  { encoding: "utf8" },
);

if (result.status === 0) {
  console.error("手書き status union が見つかりました:\n");
  console.error(result.stdout.trim());
  console.error(
    "\n型 SSoT 違反: status union は convex/lib/domain.ts の STATUSES から導出してください。",
  );
  process.exit(1);
}

if (result.status !== 1) {
  console.error(result.stderr || "type-ssot-check failed");
  process.exit(result.status ?? 2);
}

console.log("type-ssot-check: OK");
