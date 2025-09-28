import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const cm = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!cm) return NextResponse.json({ ok: true });
  if (String(auth.sub) !== cm.authorId) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
