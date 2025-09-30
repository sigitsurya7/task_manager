"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { FiCalendar, FiPaperclip } from "react-icons/fi";
import api from "@/lib/api";
import MonthCalendar from "@/components/calendar/MonthCalendar";

type Workspace = { id: string; name: string; slug: string; iconKey?: string | null; role: "ADMIN"|"MEMBER"|"VIEWER" };

export default function AdminDashboardPage() {
  const [me, setMe] = useState<{ id: string; username: string; name?: string | null } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Record<string, { id: string; username: string; name: string | null }[]>>({});
  const [totalMyTasks, setTotalMyTasks] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const md = await api.get<{ user?: any }>("/api/auth/me");
        setMe(md?.user ?? null);
      } catch {}
      try {
        const ws = await api.get<{ workspaces: Workspace[] }>("/api/workspaces");
        setWorkspaces(ws.workspaces || []);
        await Promise.all((ws.workspaces || []).map(async (w) => {
          try {
            const d = await api.get<{ members: { user: { id: string; username: string; name: string | null } }[] }>(`/api/workspaces/${w.slug}/members`);
            setMembers((m) => ({ ...m, [w.id]: (d.members || []).map((x) => x.user) }));
          } catch {}
        }));
      } catch {}
      try {
        const mt = await api.get<{ totalPages: number }>(`/api/my-tasks?page=1&pageSize=1&q=`);
        setTotalMyTasks(mt.totalPages || 0);
      } catch {}
    })();
  }, []);

  const displayName = useMemo(() => me?.name || me?.username || "Pengguna", [me]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">
        Selamat datang kembali, <span className="text-primary">{displayName}</span>!
      </h1>

      <Card>
        <CardBody>
          <p className="text-default-500">Total tugas yang ditugaskan ke kamu</p>
          <p className="text-4xl font-semibold">{totalMyTasks}</p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3 md:col-span-2">
          <h2 className="font-semibold text-lg flex items-center gap-2"><FiPaperclip /> Workspace Kamu</h2>
          {workspaces.map((w) => {
            const mem = members[w.id] || [];
            return (
              <Card key={w.id} className="border border-default-200">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{w.name}</div>
                    <div className="flex items-center gap-2">
                      <Chip size="sm" variant="flat">{mem.length} member</Chip>
                      <div className="flex -space-x-2">
                        {mem.slice(0,5).map((u) => (
                          <Avatar key={u.id} name={u.name || u.username} size="sm" className="ring-2 ring-background" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-tiny text-default-500 mt-1">Role kamu: {w.role}</div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <div className="md:col-span-1">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-2"><FiCalendar /> Kalender</h2>
          <MonthCalendar />
        </div>
      </div>
    </div>
  );
}
