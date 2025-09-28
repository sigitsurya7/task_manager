import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { columnId, title, description, progress, dueDate } = body;
  if (!columnId || !title) return NextResponse.json({ message: "columnId and title required" }, { status: 400 });

  const col = await prisma.column.findUnique({ where: { id: columnId }, include: { board: { include: { project: { include: { workspace: true } } } } } });
  if (!col) return NextResponse.json({ message: "column not found" }, { status: 404 });

  const ws = col.board.project.workspace;
  const isMember = await prisma.workspaceMember.findFirst({ where: { workspaceId: ws.id, userId: String(auth.sub) } });
  if (!isMember || (isMember.role === "VIEWER")) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const max = await prisma.task.findFirst({ where: { columnId }, orderBy: { position: "desc" }, select: { position: true } });
  const nextPos = (max?.position ?? new Prisma.Decimal(0)).plus(new Prisma.Decimal(1));

  const task = await prisma.task.create({
    data: {
      projectId: col.board.projectId,
      boardId: col.boardId,
      columnId,
      title,
      description: description ?? null,
      progress: progress ?? 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      position: nextPos,
      createdById: String(auth.sub),
    },
  });

  publish({ type: "task.created", workspaceId: ws.id, task: { id: task.id, columnId, title: task.title, progress: task.progress ?? 0, dueDate: task.dueDate?.toISOString() ?? null } });
  return NextResponse.json({ task });
}
