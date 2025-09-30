import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  if (!title) return NextResponse.json({ message: "title required" }, { status: 400 });
  const item = await prisma.checklistItem.create({ data: { checklistId: params.id, title } });
  try {
    const cl = await prisma.checklist.findUnique({ where: { id: params.id }, include: { task: { include: { project: { include: { workspace: true } } } } } });
    if (cl) publish({ type: "task.updated", workspaceId: cl.task.project.workspace.id, task: { id: cl.taskId } as any });
  } catch {}
  return NextResponse.json({ item }, { status: 201 });
}
