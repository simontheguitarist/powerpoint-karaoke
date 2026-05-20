/**
 * Render the brand mark from src/app/icon.svg into a real favicon.ico
 * (PNG-in-ICO container, two sizes: 32 and 16).
 * Run: bunx tsx scripts/make-favicon.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const svgPath = path.resolve("src/app/icon.svg");
const outPath = path.resolve("src/app/favicon.ico");

async function renderPng(size: number): Promise<Buffer> {
  return sharp(svgPath).resize(size, size).png().toBuffer();
}

function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const ICONDIR = 6;
  const ICONDIRENTRY = 16;
  const dirSize = ICONDIR + ICONDIRENTRY * images.length;

  const header = Buffer.alloc(ICONDIR);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type=ico
  header.writeUInt16LE(images.length, 4);

  const dir = Buffer.alloc(ICONDIRENTRY * images.length);
  let offset = dirSize;
  images.forEach(({ size, png }, i) => {
    const base = i * ICONDIRENTRY;
    dir.writeUInt8(size >= 256 ? 0 : size, base + 0); // width
    dir.writeUInt8(size >= 256 ? 0 : size, base + 1); // height
    dir.writeUInt8(0, base + 2); // palette
    dir.writeUInt8(0, base + 3); // reserved
    dir.writeUInt16LE(1, base + 4); // planes
    dir.writeUInt16LE(32, base + 6); // bpp
    dir.writeUInt32LE(png.length, base + 8); // size
    dir.writeUInt32LE(offset, base + 12); // offset
    offset += png.length;
  });

  return Buffer.concat([header, dir, ...images.map((i) => i.png)]);
}

async function main() {
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map(async (size) => ({ size, png: await renderPng(size) }))
  );
  const ico = buildIco(pngs);
  fs.writeFileSync(outPath, ico);
  console.log(
    `Wrote ${outPath} (${ico.length} bytes, sizes: ${sizes.join(",")})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
