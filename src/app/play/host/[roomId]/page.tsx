import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, room } from "@/lib/db/schema";
import { getUserOrRedirect } from "@/lib/session";
import { HostStage } from "@/components/HostStage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  return { title: r ? `Stage · ${r.code} · PK` : "Stage · PK" };
}

export default async function HostStagePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const user = await getUserOrRedirect();
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  if (!r) notFound();
  if (r.hostUserId !== user.id) {
    redirect(`/play/r/${r.code}`);
  }

  const myDecks = await db
    .select()
    .from(deck)
    .where(eq(deck.ownerId, user.id));

  return <HostStage roomId={roomId} myDecks={myDecks} />;
}
