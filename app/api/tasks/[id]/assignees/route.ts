import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
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
  return NextResponse.json({ ok: true });
}

