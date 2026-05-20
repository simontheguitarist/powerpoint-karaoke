import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export const getSession = cache(async () => {
  const h = await headers();
  return auth.api.getSession({ headers: h });
});

export async function getUserOrRedirect(redirectTo = "/sign-in") {
  const sess = await getSession();
  if (!sess?.user) redirect(redirectTo);
  return sess.user;
}

export async function getOptionalUser() {
  const sess = await getSession();
  return sess?.user ?? null;
}
