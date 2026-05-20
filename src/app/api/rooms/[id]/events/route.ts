import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { room } from "@/lib/db/schema";
import { subscribe } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, id) });
  if (!r) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller already closed
        }
      };
      write(`event: hello\ndata: ${JSON.stringify({ roomId: id })}\n\n`);

      const unsub = subscribe(id, write);
      const keepalive = setInterval(() => write(`: ping\n\n`), 25000);

      const cleanup = () => {
        clearInterval(keepalive);
        unsub();
        try {
          controller.close();
        } catch {
          /* */
        }
      };

      // Close on abort
      // @ts-expect-error - signal isn't typed on ReadableStream context
      this.signal?.addEventListener?.("abort", cleanup);
      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      const cleanup = (this as unknown as { _cleanup?: () => void })._cleanup;
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
