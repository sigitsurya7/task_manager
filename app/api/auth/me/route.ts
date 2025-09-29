import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ user: null }, { status: 200 });
  const user = await prisma.user.findUnique({ where: { id: String(auth.sub) }, select: { id: true, email: true, username: true, name: true, role: true } });
  return NextResponse.json({ user });
}

