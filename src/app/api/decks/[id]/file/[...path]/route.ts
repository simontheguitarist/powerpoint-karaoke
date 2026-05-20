import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck } from "@/lib/db/schema";
import { deckDir, safeResolve } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: segs } = await params;

  const d = await db.query.deck.findFirst({ where: eq(deck.id, id) });
  if (!d) return new Response("Not found", { status: 404 });

  const rel = segs.join("/");
  if (rel.includes("..") || path.isAbsolute(rel)) {
    return new Response("Forbidden", { status: 403 });
  }
  const abs = path.resolve(deckDir(id), rel);
  try {
    safeResolve(path.relative(process.cwd(), abs));
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.promises.stat(abs);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const ext = path.extname(abs).toLowerCase();
    const stream = fs.createReadStream(abs);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
