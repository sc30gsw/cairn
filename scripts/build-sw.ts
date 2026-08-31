import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { injectManifest } from "@serwist/build";
import { build } from "vite-plus";

import { renderOfflineHtml } from "./render-offline-html.ts";

const ROOT = process.cwd();
const OUT_CANDIDATES = [".output/public", ".vercel/output/static"] as const;

async function resolveOutDir() {
  for (const candidate of OUT_CANDIDATES) {
    const dir = resolve(ROOT, candidate);
    const found = await stat(dir).then(
      (s) => s.isDirectory(),
      () => false,
    );
    if (found) {
      return dir;
    }
  }
  return null;
}

const OUT = await resolveOutDir();
if (OUT === null) {
  process.stderr.write(
    `[build-sw] no build output dir found (${OUT_CANDIDATES.join(", ")}) — skipping SW generation\n`,
  );
  process.exit(0);
}
const INTERMEDIATE = resolve(ROOT, ".pwa");

await build({
  configFile: false,
  logLevel: "warn",
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(ROOT, "sw/service-worker.ts"),
      fileName: () => "service-worker.js",
      formats: ["es"],
    },
    minify: false,
    outDir: INTERMEDIATE,
    target: "es2022",
  },
});

await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, "offline.html"), renderOfflineHtml(), "utf8");

const { count, size, warnings } = await injectManifest({
  globDirectory: OUT,
  globPatterns: ["offline.html", "manifest.webmanifest", "favicon.svg", "icons/*.png"],
  swDest: resolve(OUT, "sw.js"),
  swSrc: resolve(INTERMEDIATE, "service-worker.js"),
});

for (const warning of warnings) {
  process.stderr.write(`[build-sw] ${warning}\n`);
}
process.stdout.write(`[build-sw] precached ${String(count)} files (${String(size)} bytes)\n`);
