import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  // authorize by user-level ADMIN, or being ADMIN in any workspace
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  if (current?.role !== "ADMIN") {
    const adminOf = await prisma.workspaceMember.findFirst({ where: { userId: String(auth.sub), role: "ADMIN" } });
    if (!adminOf) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10)));
  const q = (url.searchParams.get("q") || "").trim();
  const where = q
    ? {
        OR: [
          { username: { contains: q } },
          { email: { contains: q } },
          { name: { contains: q } },
        ],
      }
    : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, email: true, username: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return NextResponse.json({ users, page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const current = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { role: true } });
  if (current?.role !== "ADMIN") return NextResponse.json({ message: "forbidden" }, { status: 403 });

  const { username, email, name, password, role } = await req.json().catch(() => ({}));
  if (!username || !email || !password) {
    return NextResponse.json({ message: "username, email, password required" }, { status: 400 });
  }
  const roleValue = role === "ADMIN" ? "ADMIN" : "MEMBER"; // default MEMBER if invalid/undefined
  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (exists) return NextResponse.json({ message: "username atau email sudah digunakan" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, email, name: name ?? null, passwordHash, role: roleValue as any } });
  return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt } }, { status: 201 });
}
