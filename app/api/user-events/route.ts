import { NextResponse } from "next/server";
import { emitter } from "@/lib/events";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const userId = String(auth.sub);

  let hb: any;
  let off: ((evt: any) => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const sendData = (data: any) => {
        if (closed) return;
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      const ping = () => {
        if (closed) return;
        controller.enqueue(`: keep-alive\n\n`);
      };
      const onEvt = (evt: any) => {
        if (evt.userId === userId) sendData(evt);
      };
      off = onEvt;
      emitter.on("evt", onEvt);
      hb = setInterval(ping, 15000);
      sendData({ type: "connected" });
      req.signal.addEventListener("abort", () => {
        if (closed) return;
        closed = true;
        try { clearInterval(hb); } catch {}
        if (off) emitter.off("evt", off);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (closed) return;
      closed = true;
      try { clearInterval(hb); } catch {}
      if (off) emitter.off("evt", off);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Keep-Alive": "timeout=120",
    },
  });
}

