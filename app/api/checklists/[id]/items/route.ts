import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  if (!title) return NextResponse.json({ message: "title required" }, { status: 400 });
  const item = await prisma.checklistItem.create({ data: { checklistId: params.id, title } });
  return NextResponse.json({ item }, { status: 201 });
}
