import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiToken, user as userTable } from "@/lib/db/schema";

const PREFIX = "pkr_";

export type GeneratedToken = {
  plaintext: string;
  prefix: string;
  suffix: string;
  hash: string;
};

export function generateToken(): GeneratedToken {
  const body = crypto.randomBytes(24).toString("base64url");
  const plaintext = `${PREFIX}${body}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 8),
    suffix: plaintext.slice(-4),
    hash: hashToken(plaintext),
  };
}

export function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export async function verifyBearerToken(
  authHeader: string | null
): Promise<{ id: string; name: string; email: string } | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(PREFIX)) return null;

  const row = await db.query.apiToken.findFirst({
    where: eq(apiToken.hash, hashToken(token)),
  });
  if (!row || row.revokedAt) return null;

  // Fire-and-forget lastUsedAt bump
  try {
    db.update(apiToken)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiToken.id, row.id))
      .run();
  } catch {
    /* */
  }

  const u = await db.query.user.findFirst({
    where: eq(userTable.id, row.userId),
  });
  return u ? { id: u.id, name: u.name, email: u.email } : null;
}
