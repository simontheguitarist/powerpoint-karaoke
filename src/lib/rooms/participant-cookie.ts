import { cookies } from "next/headers";

export const COOKIE_NAME = (roomId: string) => `pk_party_${roomId.slice(0, 12)}`;

export async function getParticipantCookie(roomId: string) {
  const jar = await cookies();
  return jar.get(COOKIE_NAME(roomId))?.value ?? null;
}

export async function setParticipantCookie(
  roomId: string,
  participantId: string
) {
  const jar = await cookies();
  jar.set(COOKIE_NAME(roomId), participantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearParticipantCookie(roomId: string) {
  const jar = await cookies();
  jar.delete(COOKIE_NAME(roomId));
}
