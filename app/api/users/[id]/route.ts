import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { username, email, name, password, role } = await req.json().catch(() => ({}));

  // ensure unique fields if changing
  if (username) {
    const u = await prisma.user.findFirst({ where: { username, NOT: { id: params.id } } });
    if (u) return NextResponse.json({ message: "username sudah digunakan" }, { status: 409 });
  }
  if (email) {
    const u = await prisma.user.findFirst({ where: { email, NOT: { id: params.id } } });
    if (u) return NextResponse.json({ message: "email sudah digunakan" }, { status: 409 });
  }

  const data: any = { username, email, name };
  if (role) {
    // only allow ADMIN or MEMBER for user-level role
    if (role !== "ADMIN" && role !== "MEMBER") {
      return NextResponse.json({ message: "role tidak valid" }, { status: 400 });
    }
    data.role = role;
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ user: { id: updated.id, username: updated.username, email: updated.email, name: updated.name, role: updated.role, createdAt: updated.createdAt } });
}

export async function DELETE(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  if (current?.role !== "ADMIN") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  try {
    // remove workspace memberships first to avoid FK errors
    await prisma.workspaceMember.deleteMany({ where: { userId: params.id } });
    // optionally also remove task assignees to reduce FK blocks
    await prisma.taskAssignee.deleteMany({ where: { userId: params.id } });

    // try delete user
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // likely blocked by other FK references (e.g., comments, tasks created)
    return NextResponse.json({ message: "Tidak dapat menghapus user karena masih digunakan di data lain" }, { status: 409 });
  }
}
