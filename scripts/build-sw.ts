//* `vp build` の後段で Service Worker を作る(docs/specs/pwa-mobile.md §4)。
//? Vite プラグインは1つも足さない — `.output/public` が確定した後に「実測」して precache manifest を
//? 作れば、Nitro の出力ディレクトリを推測する一番壊れやすい部分が消える。
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { injectManifest } from "@serwist/build";
//? vite からの直接 import は禁止(development-workflow.md)
import { build } from "vite-plus";

import { renderOfflineHtml } from "./render-offline-html.ts";

const ROOT = process.cwd();
const OUT = resolve(ROOT, ".output/public");
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
