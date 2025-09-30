import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title, done } = await req.json().catch(() => ({}));
  const updated = await prisma.checklistItem.update({ where: { id: params.id }, data: { title: title ?? undefined, done: typeof done === 'boolean' ? done : undefined } });
  try {
    const item = await prisma.checklistItem.findUnique({ where: { id: params.id }, include: { checklist: { include: { task: { include: { project: { include: { workspace: true } } } } } } } });
    if (item) publish({ type: "task.updated", workspaceId: item.checklist.task.project.workspace.id, task: { id: item.checklist.taskId } as any });
  } catch {}
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const item = await prisma.checklistItem.findUnique({
    where: { id: params.id },
    include: { checklist: { include: { task: { include: { project: { include: { workspace: true } } } } } } },
  });
  if (!item) return NextResponse.json({ ok: true });
  const wsId = item.checklist.task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  await prisma.checklistItem.delete({ where: { id: params.id } });
  try {
    publish({ type: "task.updated", workspaceId: wsId, task: { id: item.checklist.taskId } as any });
  } catch {}
  return NextResponse.json({ ok: true });
}
