import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { round } from "@/lib/db/schema";
import { leaderboard, scoreRound } from "@/lib/rooms/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;
  const r = await db.query.round.findFirst({ where: eq(round.id, roundId) });
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  const scores = await scoreRound(roundId);
  const board = await leaderboard(r.roomId);
  return Response.json({ scores, leaderboard: board });
}
