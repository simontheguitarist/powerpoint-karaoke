import { headers } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deck, participant, room } from "@/lib/db/schema";
import { newId, newRoomCode } from "@/lib/ids";
import { setParticipantCookie } from "@/lib/rooms/participant-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  deckId: z.string().optional(),
});

export async function POST(req: Request) {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  // Optional: validate deck exists and is ready
  if (parsed.data.deckId) {
    const d = await db.query.deck.findFirst({
      where: eq(deck.id, parsed.data.deckId),
    });
    if (!d || d.status !== "ready") {
      return Response.json({ error: "Deck not ready" }, { status: 400 });
    }
  }

  // Generate a unique code (retry a few times if collision)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code = newRoomCode(6);
    const exists = await db.query.room.findFirst({
      where: eq(room.code, code),
    });
    if (!exists) break;
    code = "";
  }
  if (!code) {
    return Response.json({ error: "Couldn't allocate room code" }, { status: 500 });
  }

  const roomId = newId();
  const hostParticipantId = newId();

  db.transaction(() => {
    db.insert(room)
      .values({
        id: roomId,
        code,
        hostUserId: sess.user.id,
        state: "lobby",
        config: {
          maxRoundSeconds: 180,
          previewSeconds: 30,
          skipThresholdPct: 50,
          rubric: ["Humor", "Recovery", "Confidence", "Slide Mockery"],
        },
      })
      .run();
    db.insert(participant)
      .values({
        id: hostParticipantId,
        roomId,
        userId: sess.user.id,
        displayName: sess.user.name,
        role: "host",
      })
      .run();
  });

  await setParticipantCookie(roomId, hostParticipantId);

  return Response.json({
    id: roomId,
    code,
    initialDeckId: parsed.data.deckId ?? null,
  });
}
