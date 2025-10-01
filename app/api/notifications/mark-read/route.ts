import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const userId = String(auth.sub);
  const { ids, all } = await req.json().catch(() => ({ ids: [], all: false }));
  const where: any = { userId };
  if (!all && Array.isArray(ids) && ids.length) where.id = { in: ids };
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await prisma.notification.updateMany({ where, data: { readAt: new Date(), expiresAt } });
  return NextResponse.json({ ok: true });
}

