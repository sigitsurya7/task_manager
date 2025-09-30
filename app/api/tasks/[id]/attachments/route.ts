import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import fs from "node:fs/promises";
import path from "path";
import crypto from "crypto";
import { publish } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
  if (!task) return NextResponse.json({ message: "not found" }, { status: 404 });
  const wsId = task.project.workspace.id;
  const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: wsId, userId: String(auth.sub) } });
  if (!membership) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  const list = await prisma.attachment.findMany({ where: { taskId: params.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ attachments: list });
}

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let att: { name: string; url: string; type?: string } | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'file required' }, { status: 400 });
    // Basic size check (max ~20MB)
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ message: 'file too large' }, { status: 413 });
    }
    const buffer = new Uint8Array(arrayBuffer as ArrayBuffer);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const rand = crypto.randomBytes(4).toString('hex');
    const filename = `${Date.now()}-${rand}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    // Basic accept list by MIME prefix
    const type = (file.type || '').toLowerCase();
    const allowed = [
      'image/',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/vnd.openxmlformats-officedocument',
      'application/msword',
      'application/vnd.ms-excel',
    ];
    const okType = allowed.some((p) => type.startsWith(p) || type === p);
    if (!okType) {
      // still save but mark generic
    }
    att = { name: file.name, url: `/uploads/${filename}`, type: type || 'file' };
  } else {
    const { link, display } = await req.json().catch(() => ({}));
    if (!link) return NextResponse.json({ message: 'link required' }, { status: 400 });
    try {
      const u = new URL(link);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
    } catch {
      return NextResponse.json({ message: 'invalid link' }, { status: 400 });
    }
    att = { name: display || link, url: link, type: 'link' };
  }

  const created = await prisma.attachment.create({ data: { taskId: params.id, name: att!.name, url: att!.url, type: att!.type || null } });
  try {
    const task = await prisma.task.findUnique({ where: { id: params.id }, include: { project: { include: { workspace: true } } } });
    if (task) publish({ type: "task.updated", workspaceId: task.project.workspace.id, task: { id: task.id } as any });
  } catch {}
  return NextResponse.json({ attachment: created }, { status: 201 });
}
