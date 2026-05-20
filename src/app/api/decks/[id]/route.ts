import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deck, deckTag, slide } from "@/lib/db/schema";

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
