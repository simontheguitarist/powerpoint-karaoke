import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { room } from "@/lib/db/schema";
import { ProjectorView } from "@/components/ProjectorView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  return { title: r ? `Projector · ${r.code}` : "Projector" };
}

export default async function ProjectorPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  if (!r) notFound();

  return <ProjectorView roomId={roomId} code={r.code} />;
}
