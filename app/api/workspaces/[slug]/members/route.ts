import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: { include: { user: { select: { id: true, email: true, username: true, name: true } } } } } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  return NextResponse.json({ members: ws.members.map((m) => ({ id: m.id, role: m.role, user: m.user })) });
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me || me.role !== "ADMIN") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { usernameOrEmail, role } = await req.json().catch(() => ({}));
  if (!usernameOrEmail || !role) return NextResponse.json({ message: "usernameOrEmail and role required" }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });
  const mem = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } },
    create: { workspaceId: ws.id, userId: user.id, role },
    update: { role },
  });
  return NextResponse.json({ member: { id: mem.id, role: mem.role, user: { id: user.id, email: user.email, username: user.username, name: user.name } } });
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me || me.role !== "ADMIN") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { userId, role } = await req.json().catch(() => ({}));
  if (!userId || !role) return NextResponse.json({ message: "userId and role required" }, { status: 400 });
  const updated = await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: ws.id, userId } }, data: { role } });
  return NextResponse.json({ member: updated });
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const ws = await prisma.workspace.findUnique({ where: { slug: params.slug }, include: { members: true } });
  if (!ws) return NextResponse.json({ message: "not found" }, { status: 404 });
  const me = ws.members.find((m) => m.userId === String(auth.sub));
  if (!me || me.role !== "ADMIN") return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 });
  // Prevent removing last admin
  const target = ws.members.find((m) => m.userId === userId);
  const adminCount = ws.members.filter((m) => m.role === "ADMIN").length;
  if (target?.role === "ADMIN" && adminCount <= 1) {
    return NextResponse.json({ message: "cannot remove last admin" }, { status: 400 });
  }
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: ws.id, userId } });
  return NextResponse.json({ ok: true });
}
