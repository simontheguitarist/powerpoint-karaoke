import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateToken } from "@/lib/api-token";
import { db } from "@/lib/db";
import { apiToken } from "@/lib/db/schema";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(40).default("pk-deck skill"),
});

export async function GET() {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: apiToken.id,
      name: apiToken.name,
      prefix: apiToken.prefix,
      suffix: apiToken.suffix,
      createdAt: apiToken.createdAt,
      lastUsedAt: apiToken.lastUsedAt,
      revokedAt: apiToken.revokedAt,
    })
    .from(apiToken)
    .where(eq(apiToken.userId, sess.user.id))
    .orderBy(desc(apiToken.createdAt));

  return Response.json({ tokens: rows });
}

export async function POST(req: Request) {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid name" }, { status: 400 });

  const tok = generateToken();
  const id = newId();
  db.insert(apiToken)
    .values({
      id,
      userId: sess.user.id,
      name: parsed.data.name,
      hash: tok.hash,
      prefix: tok.prefix,
      suffix: tok.suffix,
    })
    .run();

  // Plaintext returned ONCE; never stored.
  return Response.json({
    id,
    name: parsed.data.name,
    token: tok.plaintext,
    prefix: tok.prefix,
    suffix: tok.suffix,
  });
}
