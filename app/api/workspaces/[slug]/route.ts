import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/events";
import { getAuth } from "@/lib/auth";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true, projects: { include: { boards: { include: { columns: { include: { tasks: true } } } }, labels: true } } } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  const isCreator = ws.createdById === String(auth.sub);
  if (!me && !isCreator) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  if (me && me.role !== "ADMIN" && !isCreator) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    // delete activity logs
    await tx.activityLog.deleteMany({ where: { workspaceId: ws.id } });
    // delete all task-related data then tasks
    for (const proj of ws.projects) {
      for (const board of proj.boards) {
        for (const col of board.columns) {
          const taskIds = col.tasks.map((t) => t.id);
          if (taskIds.length) {
            // delete attachments
            await tx.attachment.deleteMany({ where: { taskId: { in: taskIds } } });
            // delete checklists and items
            const cl = await tx.checklist.findMany({ where: { taskId: { in: taskIds } }, select: { id: true } });
            const clIds = cl.map((c) => c.id);
            if (clIds.length) {
              await tx.checklistItem.deleteMany({ where: { checklistId: { in: clIds } } });
              await tx.checklist.deleteMany({ where: { id: { in: clIds } } });
            }
            await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } });
            await tx.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
            await tx.taskLabel.deleteMany({ where: { taskId: { in: taskIds } } });
            await tx.task.deleteMany({ where: { id: { in: taskIds } } });
          }
        }
        // delete columns
        await tx.column.deleteMany({ where: { boardId: board.id } });
      }
      // delete boards
      await tx.board.deleteMany({ where: { projectId: proj.id } });
      // delete labels after detaching task labels
      await tx.label.deleteMany({ where: { projectId: proj.id } });
    }
    // delete projects
    await tx.project.deleteMany({ where: { workspaceId: ws.id } });
    // delete members
    await tx.workspaceMember.deleteMany({ where: { workspaceId: ws.id } });
    // finally delete workspace
    await tx.workspace.delete({ where: { id: ws.id } });
  });
  try {
    // notify all members (including deleter) to refresh workspace list
    for (const m of ws.members) {
      try { publish({ type: "workspaces.changed", userId: m.userId }); } catch {}
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
