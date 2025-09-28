import { NextResponse } from "next/server";
import { emitter } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("workspace");
  if (!slug) return NextResponse.json({ message: "workspace required" }, { status: 400 });
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, members: { where: { userId: String(auth.sub) }, select: { id: true } } } });
  if (!ws || ws.members.length === 0) return NextResponse.json({ message: "forbidden" }, { status: 403 });

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
        if (evt.workspaceId === ws.id) sendData(evt);
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
    },
  });
}
