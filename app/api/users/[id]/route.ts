import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const adminOf = await prisma.workspaceMember.findFirst({ where: { userId: String(auth.sub), role: "ADMIN" } });
  if (!adminOf) return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const { username, email, name, password } = await req.json().catch(() => ({}));

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
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ user: { id: updated.id, username: updated.username, email: updated.email, name: updated.name, createdAt: updated.createdAt } });
}
