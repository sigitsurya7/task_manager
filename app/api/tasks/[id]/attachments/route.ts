import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const list = await prisma.attachment.findMany({ where: { taskId: params.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ attachments: list });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let att: { name: string; url: string; type?: string } | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'file required' }, { status: 400 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const rand = crypto.randomBytes(4).toString('hex');
    const filename = `${Date.now()}-${rand}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    att = { name: file.name, url: `/uploads/${filename}`, type: file.type };
  } else {
    const { link, display } = await req.json().catch(() => ({}));
    if (!link) return NextResponse.json({ message: 'link required' }, { status: 400 });
    att = { name: display || link, url: link, type: 'link' };
  }

  const created = await prisma.attachment.create({ data: { taskId: params.id, name: att!.name, url: att!.url, type: att!.type || null } });
  return NextResponse.json({ attachment: created }, { status: 201 });
}
