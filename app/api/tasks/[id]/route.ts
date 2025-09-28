import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      labels: { include: { label: true } },
      assignees: { include: { user: { select: { id: true, username: true, name: true } } } },
    },
  });
  if (!task) return NextResponse.json({ message: "not found" }, { status: 404 });
  return NextResponse.json({
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    startDate: task.startDate,
    progress: task.progress,
    tags: task.labels.map((l) => ({ id: l.label.id, name: l.label.name })),
    assignees: task.assignees.map((a) => ({ id: a.user.id, username: a.user.username, name: a.user.name })),
  });
}

export async function PATCH(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const body = await _req.json().catch(() => ({}));
  const { title, description, progress, dueDate, startDate } = body;

  const existing = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!existing) return NextResponse.json({ message: "not found" }, { status: 404 });
  const wsId = existing.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      title: title ?? undefined,
      description: description ?? undefined,
      progress: typeof progress === "number" ? progress : undefined,
      dueDate: typeof dueDate !== 'undefined' ? (dueDate ? new Date(dueDate) : null) : undefined,
      startDate: typeof startDate !== 'undefined' ? (startDate ? new Date(startDate) : null) : undefined,
      updatedById: String(auth.sub),
    },
  });

  publish({ type: "task.updated", workspaceId: wsId, task: { id: updated.id, title: updated.title, progress: updated.progress ?? undefined, dueDate: updated.dueDate?.toISOString() ?? undefined } });
  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const existing = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!existing) return NextResponse.json({ ok: true });
  const wsId = existing.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  // delete files for attachments, then db rows
  try {
    const atts = await prisma.attachment.findMany({ where: { taskId: params.id } });
    const { promises: fs } = await import("fs");
    const pathMod = await import("path");
    for (const a of atts) {
      if (a.url && a.url.startsWith('/uploads/')) {
        try { await fs.unlink(pathMod.join(process.cwd(), 'public', a.url.replace(/^\/+/, ''))); } catch {}
      }
    }
  } catch {}

  await prisma.checklistItem.deleteMany({ where: { checklist: { taskId: params.id } } });
  await prisma.checklist.deleteMany({ where: { taskId: params.id } });
  await prisma.attachment.deleteMany({ where: { taskId: params.id } });
  await prisma.comment.deleteMany({ where: { taskId: params.id } });
  await prisma.taskAssignee.deleteMany({ where: { taskId: params.id } });
  await prisma.taskLabel.deleteMany({ where: { taskId: params.id } });
  await prisma.task.delete({ where: { id: params.id } });

  publish({ type: "task.deleted", workspaceId: wsId, taskId: params.id });
  return NextResponse.json({ ok: true });
}
