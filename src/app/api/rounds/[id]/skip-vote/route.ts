import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  participant,
  round,
  roundSlide,
  slideSkipVote,
} from "@/lib/db/schema";
import { publish } from "@/lib/events";
import { getParticipantCookie } from "@/lib/rooms/participant-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;
  const r = await db.query.round.findFirst({ where: eq(round.id, roundId) });
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  if (r.state !== "preview") {
    return Response.json({ error: "Not in preview" }, { status: 400 });
  }

  const pid = await getParticipantCookie(r.roomId);
  if (!pid) {
    return Response.json({ error: "Not in room" }, { status: 401 });
  }
  const p = await db.query.participant.findFirst({
    where: eq(participant.id, pid),
  });
  if (!p || p.roomId !== r.roomId) {
    return Response.json({ error: "Not in room" }, { status: 401 });
  }
  if (p.role === "host") {
    return Response.json({ error: "Hosts don't vote" }, { status: 403 });
  }
  // Presenter shouldn't preview
  if (p.id === r.presenterParticipantId) {
    return Response.json({ error: "Presenter can't peek" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const slideId =
    body && typeof body === "object" && typeof body.slideId === "string"
      ? body.slideId
      : null;
  if (!slideId)
    return Response.json({ error: "slideId required" }, { status: 400 });

  const rs = await db.query.roundSlide.findFirst({
    where: and(eq(roundSlide.roundId, roundId), eq(roundSlide.slideId, slideId)),
  });
  if (!rs)
    return Response.json({ error: "Slide not in round" }, { status: 404 });

  const existing = await db.query.slideSkipVote.findFirst({
    where: and(
      eq(slideSkipVote.roundSlideId, rs.id),
      eq(slideSkipVote.participantId, p.id)
    ),
  });

  let voted: boolean;
  if (existing) {
    db.delete(slideSkipVote)
      .where(
        and(
          eq(slideSkipVote.roundSlideId, rs.id),
          eq(slideSkipVote.participantId, p.id)
        )
      )
      .run();
    voted = false;
  } else {
    db.insert(slideSkipVote)
      .values({ roundSlideId: rs.id, participantId: p.id })
      .run();
    voted = true;
  }

  const totalVotes = (
    await db
      .select()
      .from(slideSkipVote)
      .where(eq(slideSkipVote.roundSlideId, rs.id))
  ).length;

  publish(r.roomId, {
    event: "preview-vote",
    data: {
      roundId,
      roundSlideId: rs.id,
      slideId,
      totalVotes,
    },
  });

  return Response.json({ voted, totalVotes });
}
