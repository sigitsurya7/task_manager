import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 });
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: { include: { members: true } } } } } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const ws = task.project.workspace;
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me || me.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const target = ws.members.find((m) => m.userId === userId);
  if (!target) return NextResponse.json({ message: "user not in workspace" }, { status: 400 });
  await prisma.taskAssignee.upsert({ where: { taskId_userId: { taskId: params.id, userId } }, create: { taskId: params.id, userId }, update: {} });
  publish({ type: "task.updated", workspaceId: ws.id, task: { id: task.id } as any });
  // notify assignee
  try {
    const notif = await prisma.notification.create({
      data: {
        userId,
        kind: 'task_assigned',
        title: 'Ditugaskan ke tugas',
        message: task.title,
        url: `/admin/workspace/${task.project.workspace.slug}?task=${task.id}`,
      },
    });
    publish({ type: 'notification', userId, notification: { id: notif.id, title: notif.title, message: notif.message ?? undefined, url: notif.url ?? undefined, createdAt: notif.createdAt.toISOString() } });
  } catch {}
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 });
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: { include: { members: true } } } } } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const ws = task.project.workspace;
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me || me.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  // Ensure target is part of the workspace
  const target = ws.members.find((m) => m.userId === userId);
  if (!target) return NextResponse.json({ message: "user not in workspace" }, { status: 400 });
  await prisma.taskAssignee.deleteMany({ where: { taskId: params.id, userId } });
  publish({ type: "task.updated", workspaceId: ws.id, task: { id: task.id } as any });
  return NextResponse.json({ ok: true });
}
