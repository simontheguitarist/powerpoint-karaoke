import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: { buffer: Buffer; mtime: number } | null = null;

function build(): Buffer {
  const root = path.resolve(process.cwd(), "skills/pk-deck");
  const zip = new AdmZip();
  const walk = (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const arcname = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        walk(abs, arcname);
      } else if (entry.isFile()) {
        zip.addLocalFile(abs, path.posix.dirname(arcname), entry.name);
      }
    }
  };
  walk(root, "pk-deck");
  return zip.toBuffer();
}

export async function GET() {
  const root = path.resolve(process.cwd(), "skills/pk-deck");
  const mtime = fs.statSync(root).mtimeMs;
  if (!cached || cached.mtime !== mtime) {
    cached = { buffer: build(), mtime };
  }
  return new Response(new Uint8Array(cached.buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="pk-deck-skill.zip"',
      "Content-Length": String(cached.buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
