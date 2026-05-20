import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiToken } from "@/lib/db/schema";
import { getUserOrRedirect } from "@/lib/session";
import { TokensManager } from "@/components/TokensManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personal tokens · Studio" };

export default async function TokensPage() {
  const user = await getUserOrRedirect();
  const rows = await db
    .select({
      id: apiToken.id,
      name: apiToken.name,
      prefix: apiToken.prefix,
      suffix: apiToken.suffix,
      createdAt: apiToken.createdAt,
      lastUsedAt: apiToken.lastUsedAt,
      revokedAt: apiToken.revokedAt,
    })
    .from(apiToken)
    .where(eq(apiToken.userId, user.id))
    .orderBy(desc(apiToken.createdAt));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="pill">Personal tokens</div>
      <h1 className="display text-5xl mt-3 leading-[1]">
        Let the pk-deck skill upload for you.
      </h1>
      <p className="text-mute mt-3 max-w-prose leading-relaxed">
        A personal token lets the <span className="font-mono">pk-deck</span>{" "}
        Claude skill upload your generated zip without you ever opening the
        Studio. Create one below, copy it once, and paste it into Claude when
        the skill asks. Tokens grant the same upload permissions as your
        account — revoke them the second they feel weird.
      </p>

      <div className="mt-10">
        <TokensManager initial={rows} />
      </div>
    </div>
  );
}
