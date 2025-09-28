import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, select: { id: true } });

  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const mem = await prisma.workspaceMember.findFirst({ where: { workspaceId: ws.id, userId: String(auth.sub) } });
  if (!mem) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  // find default board; fallback to first board of first project
  const project = await prisma.project.findFirst({ where: { workspaceId: ws.id }, include: { boards: true } });
  if (!project) return NextResponse.json({ message: "no project" }, { status: 404 });
  const board = project.boards.find((b) => b.isDefault) ?? project.boards[0];
  if (!board) return NextResponse.json({ message: "no board" }, { status: 404 });

  const columns = await prisma.column.findMany({
    where: { boardId: board.id },
    orderBy: { position: "asc" },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: {
          labels: { include: { label: true } },
          assignees: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    workspace: { id: ws.id, slug: params.slug, role: mem.role },
    board: { id: board.id, name: board.name },
    columns: columns.map((c) => ({
      id: c.id,
      title: c.title,
      accent: c.accent,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        progress: t.progress ?? 0,
        dueDate: t.dueDate,
        tags: t.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
        assignees: t.assignees.map((a) => ({ id: a.user.id, name: a.user.name, username: a.user.username })),
      })),
    }))
  });
}
