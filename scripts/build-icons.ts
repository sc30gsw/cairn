//* favicon.svg から PWA アイコンと iOS スプラッシュを起こす。手動実行専用(`vp run icons`)。
//? ビルドでは走らせない。出力は public/icons/ にコミットされた成果物が正で、このスクリプトは再生成の便宜
//? (docs/specs/pwa-mobile.md §6.3 / §19-10)。sharp が入らない環境では任意の手段で作り直してよい。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

import { PAPER_TOKENS } from "../src/lib/paper-tokens.ts";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "public/favicon.svg");
const OUT = resolve(ROOT, "public/icons");

//? スプラッシュは所有者の実機1機種分だけ(iPhone 15/16 系 393x852 @3x)。§6.4
const SPLASH_SIZES = [
  { height: 2556, width: 1179 },
  { height: 1179, width: 2556 },
] as const;

function deskBackground() {
  return { b: 0xce, g: 0xd8, r: 0xda, alpha: 1 } as const;
}

async function rasterize(size: number) {
  return await sharp(SOURCE, { density: 512 }).resize(size, size).png().toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const svg = await readFile(SOURCE);

  //* 余白なしの通常アイコン。角丸は SVG が持っているものだけ。
  for (const size of [192, 512]) {
    await writeFile(resolve(OUT, `icon-${String(size)}.png`), await rasterize(size));
  }

  //* maskable は机色で全面を塗り、絵を 80% に縮めて中央へ(マスク安全域 = 中央80%円)。
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.8);
    await sharp({
      create: { background: deskBackground(), channels: 4, height: size, width: size },
    })
      .composite([{ input: await rasterize(inner) }])
      .png()
      .toFile(resolve(OUT, `maskable-${String(size)}.png`));
  }

  //* iOS の apple-touch-icon は透明部分を黒く塗られるので、紙色で必ず埋める。
  await sharp({
    create: {
      background: { b: 0xf0, g: 0xfc, r: 0xff, alpha: 1 },
      channels: 4,
      height: 180,
      width: 180,
    },
  })
    .composite([{ input: await rasterize(180) }])
    .png()
    .toFile(resolve(OUT, "apple-touch-icon-180.png"));

  //* スプラッシュ: 机色の下地に絵を中央 25%。
  for (const { height, width } of SPLASH_SIZES) {
    const glyph = Math.round(Math.min(height, width) * 0.25);
    await sharp({
      create: { background: deskBackground(), channels: 4, height, width },
    })
      .composite([{ gravity: "centre", input: await rasterize(glyph) }])
      .png()
      .toFile(resolve(OUT, `splash-${String(width)}x${String(height)}.png`));
  }

  process.stdout.write(
    `[build-icons] wrote icons to public/icons (source ${String(svg.byteLength)} bytes, desk ${PAPER_TOKENS.desk})\n`,
  );
}

await main();
