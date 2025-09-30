import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { publish } from "@/lib/events";

export const runtime = "nodejs";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const att = await prisma.attachment.findUnique({ where: { id: params.id }, include: { task: { include: { project: { include: { workspace: true } } } } } });
  if (!att) return NextResponse.json({ ok: true });
  const wsId = att.task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  if (att.url.startsWith('/uploads/')) {
    try {
      const filePath = path.join(process.cwd(), 'public', att.url.replace(/^\/+/, ''));
      await fs.unlink(filePath);
    } catch {}
  }
  await prisma.attachment.delete({ where: { id: att.id } });
  publish({ type: "task.updated", workspaceId: wsId, task: { id: att.taskId } as any });
  return NextResponse.json({ ok: true });
}
