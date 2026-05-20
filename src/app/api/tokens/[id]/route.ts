import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiToken } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await db.query.apiToken.findFirst({
    where: and(eq(apiToken.id, id), eq(apiToken.userId, sess.user.id)),
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  db.update(apiToken)
    .set({ revokedAt: new Date() })
    .where(eq(apiToken.id, id))
    .run();

  return Response.json({ ok: true });
}
