import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const userId = String(auth.sub);
  // cleanup expired
  await prisma.notification.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  const unread = await prisma.notification.count({ where: { userId, readAt: null } });
  return NextResponse.json({ notifications: items, unread });
}

