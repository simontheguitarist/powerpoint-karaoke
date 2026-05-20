import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participant, room } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { publish } from "@/lib/events";
import {
  getParticipantCookie,
  setParticipantCookie,
} from "@/lib/rooms/participant-cookie";
import { joinSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const r = await db.query.room.findFirst({ where: eq(room.code, upper) });
  if (!r) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }
  if (r.state === "ended") {
    return Response.json({ error: "Room has ended" }, { status: 410 });
  }

  const body = await req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }
  const { displayName } = parsed.data;

  const existingId = await getParticipantCookie(r.id);
  if (existingId) {
    const existing = await db.query.participant.findFirst({
      where: eq(participant.id, existingId),
    });
    if (existing && existing.roomId === r.id) {
      return Response.json({
        id: existing.id,
        roomId: r.id,
        code: r.code,
        role: existing.role,
        displayName: existing.displayName,
      });
    }
  }

  const sess = await auth.api.getSession({ headers: await headers() });

  const participantId = newId();
  db.insert(participant)
    .values({
      id: participantId,
      roomId: r.id,
      userId: sess?.user?.id ?? null,
      displayName,
      role: "player",
    })
    .run();

  await setParticipantCookie(r.id, participantId);

  publish(r.id, {
    event: "participant",
    data: { action: "joined", id: participantId, displayName },
  });

  return Response.json({
    id: participantId,
    roomId: r.id,
    code: r.code,
    role: "player",
    displayName,
  });
}
