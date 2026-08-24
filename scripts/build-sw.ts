//* `vp build` の後段で Service Worker を作る(docs/specs/pwa-mobile.md §4)。
//? Vite プラグインは1つも足さない — `.output/public` が確定した後に「実測」して precache manifest を
//? 作れば、Nitro の出力ディレクトリを推測する一番壊れやすい部分が消える。
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { injectManifest } from "@serwist/build";
//? vite からの直接 import は禁止(development-workflow.md)
import { build } from "vite-plus";

import { renderOfflineHtml } from "./render-offline-html.ts";

const ROOT = process.cwd();
//? Nitro はホスティングプリセットで静的出力先が変わる(Vercel は .vercel/output/static)。
//? 決め打ちで throw するとデプロイごと落ちるので、実在する方を選ぶ。
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

//* 1) SW をバンドルする。minify しない — self.__SW_MANIFEST の注入点を確実に残すため。
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

//* 2) オフライン貼り紙を Paper Redesign トークンから生成する(§9.3)。
await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, "offline.html"), renderOfflineHtml(), "utf8");

//* 3) .output/public を実測して precache manifest を注入し、sw.js を書く。
const { count, size, warnings } = await injectManifest({
  globDirectory: OUT,
  //? HTML と JS/CSS は precache しない。殻だけ(§3.1)。
  globPatterns: ["offline.html", "manifest.webmanifest", "favicon.svg", "icons/*.png"],
  swDest: resolve(OUT, "sw.js"),
  swSrc: resolve(INTERMEDIATE, "service-worker.js"),
});

for (const warning of warnings) {
  process.stderr.write(`[build-sw] ${warning}\n`);
}
process.stdout.write(`[build-sw] precached ${String(count)} files (${String(size)} bytes)\n`);
