import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const userId = String(auth.sub);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10)));
  const q = (url.searchParams.get("q") || "").trim();

  // Build where clause for search filtering on task title or workspace name
  const whereAssignee: any = { userId };
  const whereTask: any = q
    ? {
        OR: [
          { title: { contains: q } },
          { column: { title: { contains: q } } },
          { project: { workspace: { name: { contains: q } } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.taskAssignee.count({
      where: {
        ...whereAssignee,
        task: whereTask,
      },
    }),
    prisma.taskAssignee.findMany({
      where: {
        ...whereAssignee,
        task: whereTask,
      },
      include: {
        task: {
          include: {
            column: true,
            project: { include: { workspace: true } },
          },
        },
      },
      orderBy: { task: { updatedAt: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const tasks = rows.map((ra) => ({
    id: ra.task.id,
    title: ra.task.title,
    progress: ra.task.progress,
    dueDate: ra.task.dueDate,
    column: ra.task.column.title,
    workspace: { slug: ra.task.project.workspace.slug, name: ra.task.project.workspace.name },
  }));

  return NextResponse.json({
    tasks,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
}
