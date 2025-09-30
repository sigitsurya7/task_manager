import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { labelId, name, color } = await req.json().catch(() => ({}));
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  let lblId = labelId as string | undefined;
  if (!lblId) {
    if (!name) return NextResponse.json({ message: "name required" }, { status: 400 });
    const lbl = await prisma.label.create({ data: { name, color: color ?? "secondary", projectId: task.projectId } });
    lblId = lbl.id;
  }
  await prisma.taskLabel.upsert({
    where: { taskId_labelId: { taskId: task.id, labelId: lblId! } },
    create: { taskId: task.id, labelId: lblId! },
    update: {},
  });
  publish({ type: "task.updated", workspaceId: wsId, task: { id: task.id } as any });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } }, labels: true } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const projectLabels = await prisma.label.findMany({ where: { projectId: task.projectId }, orderBy: { name: 'asc' } });
  const attachedIds = new Set(task.labels.map((tl) => tl.labelId));
  const labels = projectLabels.map((l) => ({ id: l.id, name: l.name, color: l.color, selected: attachedIds.has(l.id) }));
  return NextResponse.json({ labels });
}

export async function DELETE(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { labelId } = await req.json().catch(() => ({}));
  if (!labelId) return NextResponse.json({ message: "labelId required" }, { status: 400 });
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!task) return NextResponse.json({ message: "task not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership || membership.role === "VIEWER") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  await prisma.taskLabel.deleteMany({ where: { taskId: task.id, labelId } });
  publish({ type: "task.updated", workspaceId: wsId, task: { id: task.id } as any });
  return NextResponse.json({ ok: true });
}
