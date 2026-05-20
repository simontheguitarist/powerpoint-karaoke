import fs from "node:fs";
import path from "node:path";

export const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_DIR ?? "./storage"
);

export function deckDir(deckId: string) {
  return path.join(STORAGE_ROOT, "decks", deckId);
}

export function deckSlidesDir(deckId: string) {
  return path.join(deckDir(deckId), "slides");
}

export function deckSourceDir(deckId: string) {
  return path.join(deckDir(deckId), "source");
}

export async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

export async function ensureDeckDirs(deckId: string) {
  await ensureDir(deckSlidesDir(deckId));
  await ensureDir(deckSourceDir(deckId));
}

/**
 * Resolve a user-supplied storage path and refuse anything that escapes
 * STORAGE_ROOT. Returns the absolute path on success, throws on traversal.
 */
export function safeResolve(rel: string): string {
  const abs = path.resolve(STORAGE_ROOT, rel);
  const root = STORAGE_ROOT.endsWith(path.sep)
    ? STORAGE_ROOT
    : STORAGE_ROOT + path.sep;
  if (abs !== STORAGE_ROOT && !abs.startsWith(root)) {
    throw new Error(`path escapes storage root: ${rel}`);
  }
  return abs;
}

export function slideRelPath(
  deckId: string,
  index: number,
  ext: "png" | "html"
) {
  return path.posix.join(
    "decks",
    deckId,
    "slides",
    `${String(index + 1).padStart(4, "0")}.${ext}`
  );
}

export function thumbRelPath(deckId: string) {
  return path.posix.join("decks", deckId, "thumb.png");
}
