import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const cl = await prisma.checklist.findUnique({ where: { id: params.id }, include: { task: { include: { project: { include: { workspace: true } } } } } });
  await prisma.checklistItem.deleteMany({ where: { checklistId: params.id } });
  await prisma.checklist.delete({ where: { id: params.id } });
  try { if (cl) publish({ type: "task.updated", workspaceId: cl.task.project.workspace.id, task: { id: cl.taskId } as any }); } catch {}
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  const updated = await prisma.checklist.update({ where: { id: params.id }, data: { title: title ?? undefined } });
  try {
    const cl = await prisma.checklist.findUnique({ where: { id: params.id }, include: { task: { include: { project: { include: { workspace: true } } } } } });
    if (cl) publish({ type: "task.updated", workspaceId: cl.task.project.workspace.id, task: { id: cl.taskId } as any });
  } catch {}
  return NextResponse.json({ checklist: updated });
}
