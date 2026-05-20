import { redirect } from "next/navigation";

// Legacy projector URL: there's now a single front-of-room screen at
// /play/host/<id>. Redirect anyone who lands here from old links.
export default async function ProjectorRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/play/host/${roomId}`);
}
