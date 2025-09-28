import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { toColumnId, position } = await req.json().catch(() => ({}));
  if (!toColumnId || typeof position === "undefined") return NextResponse.json({ message: "toColumnId and position required" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!task) return NextResponse.json({ message: "not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  // compute decimal position from index in target column
  const tasks = await prisma.task.findMany({ where: { columnId: toColumnId }, orderBy: { position: "asc" }, select: { id: true, position: true } });
  const idx = Number(position);
  const prev = tasks[idx - 1]?.position as Prisma.Decimal | undefined;
  const next = tasks[idx]?.position as Prisma.Decimal | undefined;
  let newPos: Prisma.Decimal;
  if (prev && next) {
    newPos = prev.plus(next).div(new Prisma.Decimal(2));
  } else if (prev && !next) {
    newPos = prev.plus(new Prisma.Decimal(1));
  } else if (!prev && next) {
    newPos = next.minus(new Prisma.Decimal(1));
  } else {
    newPos = new Prisma.Decimal(1);
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { columnId: toColumnId, position: newPos, updatedById: String(auth.sub) },
  });

  publish({ type: "task.moved", workspaceId: wsId, taskId: updated.id, fromColumnId: task.columnId, toColumnId, position: String(position) });
  return NextResponse.json({ task: updated });
}
