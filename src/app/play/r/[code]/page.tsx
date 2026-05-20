import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { room } from "@/lib/db/schema";
import { ParticipantApp } from "@/components/ParticipantApp";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Room ${code.toUpperCase()} · PowerPoint Karaoke` };
}

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const r = await db.query.room.findFirst({ where: eq(room.code, upper) });
  if (!r) notFound();

  return <ParticipantApp roomId={r.id} code={upper} />;
}
