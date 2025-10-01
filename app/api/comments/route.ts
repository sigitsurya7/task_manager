import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ comments: [] });
  const list = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const comments = list.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: { id: c.author.id, username: c.author.username, name: c.author.name } }));
  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { taskId, body } = await req.json().catch(() => ({}));
  if (!taskId || !body) return NextResponse.json({ message: "taskId and body required" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { include: { workspace: true } } } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const base = await prisma.comment.create({ data: { taskId, authorId: String(auth.sub), body } });
  const comment = await prisma.comment.findUnique({ where: { id: base.id }, include: { author: { select: { id: true, username: true, name: true } } } });
  publish({ type: "comment.created", workspaceId: wsId, taskId, commentId: comment!.id });
  // Notify assignees except author
  try {
    const assignees = await prisma.taskAssignee.findMany({ where: { taskId }, select: { userId: true } });
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { include: { workspace: true } } } });
    const url = task ? `/admin/workspace/${task.project.workspace.slug}?task=${task.id}` : undefined;
    for (const a of assignees) {
      if (a.userId === String(auth.sub)) continue;
      const notif = await prisma.notification.create({ data: { userId: a.userId, kind: 'comment', title: 'Komentar baru', message: body.slice(0, 80), url } });
      publish({ type: 'notification', userId: a.userId, notification: { id: notif.id, title: notif.title, message: notif.message ?? undefined, url: notif.url ?? undefined, createdAt: notif.createdAt.toISOString() } });
    }
  } catch {}
  return NextResponse.json({ comment: { id: comment!.id, body: comment!.body, createdAt: comment!.createdAt, author: { id: comment!.author.id, username: comment!.author.username, name: comment!.author.name } } });
}
