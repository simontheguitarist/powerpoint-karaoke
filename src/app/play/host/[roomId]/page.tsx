import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, room } from "@/lib/db/schema";
import { getUserOrRedirect } from "@/lib/session";
import { HostPanel } from "@/components/HostPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  return { title: r ? `Host · ${r.code} · PK` : "Host · PK" };
}

export default async function HostRoomPage({
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

  return <HostPanel roomId={roomId} myDecks={myDecks} />;
}
