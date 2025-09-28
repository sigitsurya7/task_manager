import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  await prisma.checklistItem.deleteMany({ where: { checklistId: params.id } });
  await prisma.checklist.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  const updated = await prisma.checklist.update({ where: { id: params.id }, data: { title: title ?? undefined } });
  return NextResponse.json({ checklist: updated });
}
