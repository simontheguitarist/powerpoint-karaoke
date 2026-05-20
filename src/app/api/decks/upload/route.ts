import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyBearerToken } from "@/lib/api-token";
import { db } from "@/lib/db";
import { deck, deckTag } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { jobQueue } from "@/lib/jobs/queue";
import { processUpload } from "@/lib/jobs/process-upload";
import { deckSourceDir, ensureDir } from "@/lib/storage";
import { uploadMetaSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

export async function POST(req: Request) {
  const h = await headers();
  const bearerUser = await verifyBearerToken(h.get("authorization"));
  let userId: string | null = bearerUser?.id ?? null;
  if (!userId) {
    const sess = await auth.api.getSession({ headers: h });
    userId = sess?.user?.id ?? null;
  }
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const meta = uploadMetaSchema.safeParse({
    title: form.get("title"),
    description: form.get("description") ?? "",
    tags: form.get("tags") ?? "",
    spice: form.get("spice") ?? "mild",
  });
  if (!meta.success) {
    return Response.json(
      { error: "Invalid metadata", issues: meta.error.flatten() },
      { status: 400 }
    );
  }

  const rawFiles = form.getAll("files").filter((v): v is File => v instanceof File);
  if (rawFiles.length === 0) {
    return Response.json({ error: "No files" }, { status: 400 });
  }

  for (const f of rawFiles) {
    if (f.size > 100 * 1024 * 1024) {
      return Response.json(
        { error: `File too large: ${f.name}` },
        { status: 413 }
      );
    }
    if (f.type && !ACCEPTED.has(f.type) && !looksAcceptedByName(f.name)) {
      return Response.json(
        { error: `Unsupported file type: ${f.name}` },
        { status: 415 }
      );
    }
  }

  const deckId = newId();
  await ensureDir(deckSourceDir(deckId));

  const saved: Array<{ name: string; path: string; mime: string | null }> = [];
  for (const f of rawFiles) {
    const safeName = f.name.replace(/[^\w.\-]/g, "_").slice(0, 120);
    const tmpPath = path.join(deckSourceDir(deckId), `${newId()}_${safeName}`);
    await fs.promises.writeFile(tmpPath, Buffer.from(await f.arrayBuffer()));
    saved.push({ name: f.name, path: tmpPath, mime: f.type || null });
  }

  const isSkillZip =
    rawFiles.length === 1 && /\.zip$/i.test(rawFiles[0].name);

  db.transaction(() => {
    db.insert(deck)
      .values({
        id: deckId,
        ownerId: userId,
        title: meta.data.title,
        description: meta.data.description,
        source: isSkillZip ? "ai" : "upload",
        spiceLevel: meta.data.spice,
        status: "processing",
      })
      .run();
    for (const t of meta.data.tags) {
      db.insert(deckTag).values({ deckId, tag: t }).run();
    }
  });

  jobQueue
    .add(() => processUpload({ deckId, files: saved }))
    .catch((err) => console.error("[upload]", deckId, err));

  return Response.json({ id: deckId });
}

function looksAcceptedByName(name: string) {
  return /\.(png|jpe?g|webp|gif|bmp|heic|pdf|pptx?|zip)$/i.test(name);
}
