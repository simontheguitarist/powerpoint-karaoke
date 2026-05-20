import fs from "node:fs";
import path from "node:path";

// STORAGE_DIR comes from env at runtime. We compute the absolute root
// inside a function so the path.resolve happens at call time, not module
// load — and we use a turbopackIgnore comment so Next's file tracer
// doesn't conclude that the whole project should be bundled.
let cachedRoot: string | null = null;
export function storageRoot(): string {
  if (cachedRoot) return cachedRoot;
  const raw = process.env.STORAGE_DIR ?? "./storage";
  cachedRoot = path.isAbsolute(raw)
    ? raw
    : path.join(/*turbopackIgnore: true*/ process.cwd(), raw);
  return cachedRoot;
}

export function deckDir(deckId: string) {
  return path.join(storageRoot(), "decks", deckId);
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
 * the storage root. Returns the absolute path on success, throws on traversal.
 */
export function safeResolve(rel: string): string {
  const root = storageRoot();
  const abs = path.resolve(root, rel);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
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
