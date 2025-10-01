import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { publish } from "@/lib/events";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: { include: { user: { select: { id: true, email: true, username: true, name: true } } } } } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  return NextResponse.json({ members: ws.members.map((m) => ({ id: m.id, role: m.role, user: m.user })) });
}

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  const allowed = (me && me.role === "ADMIN") || current?.role === "ADMIN";
  if (!allowed) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { usernameOrEmail, role } = await req.json().catch(() => ({}));
  if (!usernameOrEmail || !role) return NextResponse.json({ message: "usernameOrEmail and role required" }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });
  const mem = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } },
    create: { workspaceId: ws.id, userId: user.id, role },
    update: { role },
  });
  publish({ type: "workspace.members.changed", workspaceId: ws.id });
  // Create ephemeral notification for the added user
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        kind: 'workspace_added',
        title: 'Ditambahkan ke workspace',
        message: ws.name,
        url: `/admin/workspace/${ws.slug}`,
      },
    });
    publish({ type: 'notification', userId: user.id, notification: { id: notif.id, title: notif.title, message: notif.message ?? undefined, url: notif.url ?? undefined, createdAt: notif.createdAt.toISOString() } });
  } catch {}
  try { publish({ type: "workspaces.changed", userId: user.id }); } catch {}
  return NextResponse.json({ member: { id: mem.id, role: mem.role, user: { id: user.id, email: user.email, username: user.username, name: user.name } } });
}

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  const allowed = (me && me.role === "ADMIN") || current?.role === "ADMIN";
  if (!allowed) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { userId, role } = await req.json().catch(() => ({}));
  if (!userId || !role) return NextResponse.json({ message: "userId and role required" }, { status: 400 });
  const updated = await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: ws.id, userId } }, data: { role } });
  publish({ type: "workspace.members.changed", workspaceId: ws.id });
  return NextResponse.json({ member: updated });
}

export async function DELETE(req: Request, context: any) {
  const { params } = context as { params: { slug: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  const allowed = (me && me.role === "ADMIN") || current?.role === "ADMIN";
  if (!allowed) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 });
  // Prevent removing last admin
  const target = ws.members.find((m) => m.userId === userId);
  const adminCount = ws.members.filter((m) => m.role === "ADMIN").length;
  if (target?.role === "ADMIN" && adminCount <= 1) {
    return NextResponse.json({ message: "cannot remove last admin" }, { status: 400 });
  }
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: ws.id, userId } });
  publish({ type: "workspace.members.changed", workspaceId: ws.id });
  try { publish({ type: "workspaces.changed", userId }); } catch {}
  return NextResponse.json({ ok: true });
}
