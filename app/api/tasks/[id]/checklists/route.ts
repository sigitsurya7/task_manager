import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const items = await prisma.checklist.findMany({ where: { taskId: params.id }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ checklists: items });
}

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  if (!title) return NextResponse.json({ message: "title required" }, { status: 400 });
  const created = await prisma.checklist.create({ data: { taskId: params.id, title } });
  try {
    const t = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
    if (t) publish({ type: "task.updated", workspaceId: t.project.workspace.id, task: { id: t.id } as any });
  } catch {}
  return NextResponse.json({ checklist: created }, { status: 201 });
}
