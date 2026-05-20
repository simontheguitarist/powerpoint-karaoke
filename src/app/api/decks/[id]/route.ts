import fs from "node:fs";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { verifyBearerToken } from "@/lib/api-token";
import { db } from "@/lib/db";
import { deck, deckTag, round, slide } from "@/lib/db/schema";
import { deckDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const d = await db.query.deck.findFirst({ where: eq(deck.id, id) });
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });

  const sess = await auth.api.getSession({ headers: await headers() });
  const tags = (
    await db.select().from(deckTag).where(eq(deckTag.deckId, id))
  ).map((t) => t.tag);
  const slides = await db
    .select()
    .from(slide)
    .where(eq(slide.deckId, id))
    .orderBy(asc(slide.index));

  return Response.json({
    deck: d,
    tags,
    slides,
    isOwner: sess?.user?.id === d.ownerId,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const d = await db.query.deck.findFirst({ where: eq(deck.id, id) });
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });
  if (d.ownerId !== userId) {
    return Response.json({ error: "Not your deck" }, { status: 403 });
  }

  // Block if any round still references this deck.
  const inUse = await db
    .select({ id: round.id, state: round.state, roomId: round.roomId })
    .from(round)
    .where(eq(round.deckId, id))
    .limit(1);
  if (inUse.length > 0) {
    return Response.json(
      {
        error:
          "This deck is part of a game session and can't be deleted yet. End the session first.",
        roundId: inUse[0].id,
        roomId: inUse[0].roomId,
      },
      { status: 409 }
    );
  }

  // Cascade handles deck_tag + slide; storage folder is ours to clean up.
  db.delete(deck).where(eq(deck.id, id)).run();
  try {
    await fs.promises.rm(deckDir(id), { recursive: true, force: true });
  } catch {
    /* don't fail the request — DB is already gone */
  }

  return Response.json({ ok: true });
}
