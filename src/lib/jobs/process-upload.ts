import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, deckTag, slide } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import {
  deckDir,
  deckSlidesDir,
  deckSourceDir,
  ensureDeckDirs,
  slideRelPath,
} from "@/lib/storage";

const SOFFICE = process.env.SOFFICE_PATH ?? "soffice";
const PDFTOPPM = process.env.PDFTOPPM_PATH ?? "pdftoppm";

function runCmd(cmd: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (b) => (stderr += b.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

async function convertPptxToPdf(pptxPath: string, outDir: string): Promise<string> {
  await runCmd(SOFFICE, [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    pptxPath,
  ]);
  const base = path.basename(pptxPath, path.extname(pptxPath));
  return path.join(outDir, `${base}.pdf`);
}

async function rasterizePdf(pdfPath: string, outDir: string): Promise<string[]> {
  const prefix = path.join(outDir, "page");
  await runCmd(PDFTOPPM, ["-png", "-r", "144", pdfPath, prefix]);
  const files = (await fs.promises.readdir(outDir))
    .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
    .map((f) => path.join(outDir, f))
    .sort();
  return files;
}

async function normalizeImage(srcPath: string, destPath: string) {
  await sharp(srcPath)
    .rotate()
    .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toFile(destPath);
}

async function makeThumbnail(srcPng: string, deckId: string) {
  const dest = path.join(deckDir(deckId), "thumb.png");
  await sharp(srcPng)
    .resize({ width: 800, height: 450, fit: "cover" })
    .png()
    .toFile(dest);
}

async function renderHtmlThumbnail(slidePath: string, deckId: string) {
  // Render the actual HTML slide via headless Chromium so the library
  // thumb looks like the real first slide.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    // In Docker we use the system `chromium` package (set via env);
    // in dev Playwright's bundled Chromium is used.
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.goto("file://" + slidePath, { waitUntil: "load", timeout: 15000 });
    const buf = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    const dest = path.join(deckDir(deckId), "thumb.png");
    await sharp(buf)
      .resize({ width: 800, height: 450, fit: "cover" })
      .png()
      .toFile(dest);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function placeholderThumbnail(deckId: string, title: string) {
  const safe = title.replace(/[<&"']/g, "").slice(0, 80);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#ff4d2e"/>
          <stop offset="1" stop-color="#1a1f2e"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#g)"/>
      <text x="64" y="120" font-family="Georgia, serif" font-size="42" fill="white" opacity="0.6">AI deck · PowerPoint Karaoke</text>
      <text x="64" y="380" font-family="Georgia, serif" font-size="120" fill="white">${escapeForSvg(safe.slice(0, 30))}</text>
      <text x="64" y="480" font-family="Georgia, serif" font-size="72" fill="white" opacity="0.85">${escapeForSvg(safe.slice(30, 60))}</text>
    </svg>`
  );
  const dest = path.join(deckDir(deckId), "thumb.png");
  await sharp(svg).png().toFile(dest);
}

function escapeForSvg(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type UploadInput = {
  deckId: string;
  files: Array<{ name: string; path: string; mime: string | null }>;
};

const SAFE_HTML_RE = /^slide-(\d{1,3})\.html$/i;

function processSkillZip(deckId: string, zipPath: string) {
  const zip = new AdmZip(zipPath);
  const entries = zip
    .getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => ({
      entry: e,
      baseName: path.basename(e.entryName),
      relName: e.entryName.replace(/^\/+/, ""),
    }));

  const slideEntries = entries
    .filter((e) => SAFE_HTML_RE.test(e.baseName))
    .sort((a, b) => a.baseName.localeCompare(b.baseName));

  if (slideEntries.length === 0) {
    throw new Error(
      "Zip contained no slide-NN.html files. Did the pk-deck skill produce it?"
    );
  }

  const slidesDir = deckSlidesDir(deckId);
  const writtenIds: Array<{ id: string; index: number; src: string }> = [];
  for (let i = 0; i < slideEntries.length; i++) {
    const e = slideEntries[i];
    const html = e.entry.getData().toString("utf-8");
    const rel = slideRelPath(deckId, i, "html");
    const abs = path.resolve(slidesDir, path.basename(rel));
    fs.writeFileSync(abs, html);
    writtenIds.push({ id: newId(), index: i, src: rel });
  }

  let meta: { title?: string; description?: string; tags?: string[] } = {};
  const metaEntry = entries.find((e) => e.baseName === "meta.json");
  if (metaEntry) {
    try {
      meta = JSON.parse(metaEntry.entry.getData().toString("utf-8"));
    } catch {
      /* ignore — keep meta empty */
    }
  }

  return { slides: writtenIds, meta };
}

export async function processUpload({ deckId, files }: UploadInput) {
  try {
    await ensureDeckDirs(deckId);
    const slides: Array<{ id: string; src: string; index: number; kind: "image" | "html" }> = [];

    const isImage = (m: string | null, name: string) =>
      m?.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name);
    const isPdf = (m: string | null, name: string) =>
      m === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    const isPptx = (m: string | null, name: string) =>
      m ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      /\.pptx?$/i.test(name);
    const isZip = (m: string | null, name: string) =>
      m === "application/zip" ||
      m === "application/x-zip-compressed" ||
      /\.zip$/i.test(name);

    let nextIndex = 0;
    let skillMeta:
      | { title?: string; description?: string; tags?: string[] }
      | null = null;

    for (const f of files) {
      if (isZip(f.mime, f.name)) {
        if (files.length !== 1) {
          throw new Error("Upload a single .zip on its own.");
        }
        const { slides: skillSlides, meta } = processSkillZip(deckId, f.path);
        slides.push(
          ...skillSlides.map((s) => ({ ...s, kind: "html" as const }))
        );
        skillMeta = meta;
        nextIndex = slides.length;
      } else if (isImage(f.mime, f.name)) {
        const rel = slideRelPath(deckId, nextIndex, "png");
        const abs = path.resolve(deckSlidesDir(deckId), path.basename(rel));
        await normalizeImage(f.path, abs);
        slides.push({
          id: newId(),
          src: rel,
          index: nextIndex++,
          kind: "image",
        });
      } else if (isPdf(f.mime, f.name)) {
        const tmp = path.join(deckSourceDir(deckId), `__pdf_${newId()}`);
        await fs.promises.mkdir(tmp, { recursive: true });
        const pages = await rasterizePdf(f.path, tmp);
        for (const p of pages) {
          const rel = slideRelPath(deckId, nextIndex, "png");
          const abs = path.resolve(deckSlidesDir(deckId), path.basename(rel));
          await normalizeImage(p, abs);
          slides.push({
            id: newId(),
            src: rel,
            index: nextIndex++,
            kind: "image",
          });
        }
        await fs.promises.rm(tmp, { recursive: true, force: true });
      } else if (isPptx(f.mime, f.name)) {
        const tmp = path.join(deckSourceDir(deckId), `__pptx_${newId()}`);
        await fs.promises.mkdir(tmp, { recursive: true });
        const pdfPath = await convertPptxToPdf(f.path, tmp);
        const pages = await rasterizePdf(pdfPath, tmp);
        for (const p of pages) {
          const rel = slideRelPath(deckId, nextIndex, "png");
          const abs = path.resolve(deckSlidesDir(deckId), path.basename(rel));
          await normalizeImage(p, abs);
          slides.push({
            id: newId(),
            src: rel,
            index: nextIndex++,
            kind: "image",
          });
        }
        await fs.promises.rm(tmp, { recursive: true, force: true });
      } else {
        throw new Error(`Unsupported file: ${f.name}`);
      }
    }

    if (slides.length === 0) {
      throw new Error("No slides produced from upload");
    }

    // Thumbnail: PNG decks → resize slide 1; HTML decks → headless
    // render of slide-01.html; fallback to SVG placeholder if Chromium
    // isn't available (e.g. dev box without Playwright browsers).
    const firstImage = slides.find((s) => s.kind === "image");
    const firstHtml = slides.find((s) => s.kind === "html");
    if (firstImage) {
      const firstAbs = path.resolve(
        deckSlidesDir(deckId),
        path.basename(firstImage.src)
      );
      await makeThumbnail(firstAbs, deckId);
    } else if (firstHtml) {
      const firstAbs = path.resolve(
        deckSlidesDir(deckId),
        path.basename(firstHtml.src)
      );
      try {
        await renderHtmlThumbnail(firstAbs, deckId);
      } catch (e) {
        console.warn(
          "[upload] HTML thumbnail render failed, falling back to placeholder:",
          e instanceof Error ? e.message : e
        );
        await placeholderThumbnail(deckId, skillMeta?.title ?? "AI deck");
      }
    } else {
      await placeholderThumbnail(deckId, skillMeta?.title ?? "AI deck");
    }

    db.transaction(() => {
      for (const s of slides) {
        db.insert(slide)
          .values({
            id: s.id,
            deckId,
            index: s.index,
            kind: s.kind,
            src: s.src,
            ...(s.kind === "html"
              ? { width: 1280, height: 720 }
              : {}),
          })
          .run();
      }
      const updates: Record<string, unknown> = {
        status: "ready" as const,
        slideCount: slides.length,
        updatedAt: new Date(),
      };
      if (skillMeta?.title)
        updates.title = String(skillMeta.title).slice(0, 80);
      if (skillMeta?.description)
        updates.description = String(skillMeta.description).slice(0, 500);
      db.update(deck).set(updates).where(eq(deck.id, deckId)).run();
      if (skillMeta?.tags) {
        for (const raw of skillMeta.tags) {
          if (typeof raw !== "string") continue;
          const t = raw
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-]/g, "-")
            .slice(0, 24);
          if (!t) continue;
          try {
            db.insert(deckTag).values({ deckId, tag: t }).run();
          } catch {
            /* unique violation — ignore */
          }
        }
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    db.update(deck)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(deck.id, deckId))
      .run();
    throw e;
  } finally {
    for (const f of files) {
      await fs.promises.unlink(f.path).catch(() => {});
    }
  }
}
