import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/events";

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ workspaces: [] }, { status: 200 });
  const userId = String(auth.sub);
  const rows = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  const workspaces = rows.map((r) => ({
    id: r.workspace.id,
    name: r.workspace.name,
    slug: r.workspace.slug,
    iconKey: r.workspace.iconKey ?? "FiZap",
    role: r.role,
  }));
  return NextResponse.json({ workspaces });
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const userId = String(auth.sub);
  const body = await req.json().catch(() => ({}));
  const { name, slug, iconKey } = body;
  if (!name || !slug) return NextResponse.json({ message: "Missing name or slug" }, { status: 400 });
  // enforce unique name and slug
  const existsSlug = await prisma.workspace.findUnique({ where: { slug } });
  if (existsSlug) return NextResponse.json({ message: "Slug already in use" }, { status: 409 });
  const existsName = await prisma.workspace.findFirst({ where: { name } });
  if (existsName) return NextResponse.json({ message: "Name already in use" }, { status: 409 });
  const ws = await prisma.workspace.create({
    data: {
      name,
      slug,
      iconKey: iconKey ?? "FiZap",
      createdById: userId,
      members: { create: { userId, role: "ADMIN" } },
      projects: {
        create: {
          name: `${name} Project`,
          key: null,
          boards: {
            create: {
              name: `${name} Board`,
              isDefault: true,
              columns: {
                create: [
                  { title: "To Do", accent: "bg-danger", position: "1" },
                  { title: "In Progress", accent: "bg-warning", position: "2" },
                  { title: "On Review", accent: "bg-secondary", position: "3" },
                  { title: "Revision", accent: "bg-warning-300", position: "4" },
                  { title: "Complete", accent: "bg-success", position: "5" },
                  { title: "Pending", accent: "bg-default-400", position: "6" },
                ],
              },
            },
          },
        },
      },
    },
  });
  try { publish({ type: "workspaces.changed", userId }); } catch {}
  return NextResponse.json({ workspace: { id: ws.id, name: ws.name, slug: ws.slug, iconKey: ws.iconKey, role: "ADMIN" } }, { status: 201 });
}
