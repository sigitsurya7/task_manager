import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const cm = await prisma.comment.findUnique({ where: { id: params.id }, include: { task: { include: { project: { include: { workspace: true } } } } } });
  if (!cm) return NextResponse.json({ ok: true });
  if (String(auth.sub) !== cm.authorId) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  await prisma.comment.delete({ where: { id: params.id } });
  try { publish({ type: "task.updated", workspaceId: cm.task.project.workspace.id, task: { id: cm.taskId } as any }); } catch {}
  return NextResponse.json({ ok: true });
}
