"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
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
  const [summary, setSummary] = useState<{ title: string; count: number }[]>([]);
  const [summaryMine, setSummaryMine] = useState<{ title: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      let myId: string | null = null;
      try {
        const md = await api.get<{ user?: any }>("/api/auth/me");
        setMe(md?.user ?? null);
        myId = md?.user?.id ?? null;
      } catch {}
      try {
        const ws = await api.get<{ workspaces: Workspace[] }>("/api/workspaces");
        const list = ws.workspaces || [];
        setWorkspaces(list);
        const global = new Map<string, number>();
        const mine = new Map<string, number>();
        await Promise.all(list.map(async (w) => {
          try {
            const d = await api.get<{ members: { user: { id: string; username: string; name: string | null } }[] }>(`/api/workspaces/${w.slug}/members`);
            setMembers((m) => ({ ...m, [w.id]: (d.members || []).map((x) => x.user) }));
          } catch {}
          try {
            const b = await api.get<{ columns: { title: string; tasks: { assignees?: { id: string }[] }[] }[] }>(`/api/board/${w.slug}`);
            (b.columns || []).forEach((c)=>{
              const key = (c.title || 'Untitled').trim();
              global.set(key, (global.get(key)||0) + (c.tasks?.length||0));
              if (myId) {
                const mineCount = (c.tasks||[]).filter((t)=> (t.assignees||[]).some((a)=> a.id === myId)).length;
                mine.set(key, (mine.get(key)||0) + mineCount);
              }
            });
          } catch {}
        }));
        const order = ["To Do","In Progress","On Review","Revision","Complete","Pending"];
        const ordered: { title: string; count: number }[] = [];
        const orderedMine: { title: string; count: number }[] = [];
        for (const label of order) {
          const found = Array.from(global.keys()).find((k)=>k.toLowerCase()===label.toLowerCase());
          if (found) { ordered.push({ title: label, count: global.get(found)||0 }); global.delete(found); }
          const foundMine = Array.from(mine.keys()).find((k)=>k.toLowerCase()===label.toLowerCase());
          if (foundMine) { orderedMine.push({ title: label, count: mine.get(foundMine)||0 }); mine.delete(foundMine); }
        }
        Array.from(global.entries()).forEach(([k, v]) => ordered.push({ title: k, count: v }));
        Array.from(mine.entries()).forEach(([k, v]) => orderedMine.push({ title: k, count: v }));
        setSummary(ordered);
        setSummaryMine(orderedMine);
      } catch {}
    })();
  }, []);

  const displayName = useMemo(() => me?.name || me?.username || "Pengguna", [me]);
  const getAccent = (title: string) => {
    const key = (title || '').toLowerCase();
    const map: Record<string, string> = {
      'to do': 'bg-danger',
      'in progress': 'bg-warning',
      'on review': 'bg-secondary',
      'revision': 'bg-warning-300',
      'complete': 'bg-success',
      'pending': 'bg-default-400',
    };
    return map[key] || 'bg-default-300';
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">
        Selamat datang kembali, <span className="text-primary capitalize">{displayName}</span>!
      </h1>
      {/* Bento summary across all workspaces */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {summary.map((c) => (
            <Card key={c.title}>
              <CardHeader className="flex justify-between gap-8">
                <span className="text-tiny text-default-500">{c.title}</span>
                <div className={`h-1 flex-1 rounded-full ${getAccent(c.title)}`} />
              </CardHeader>
              <CardBody>
                <span className="text-2xl font-semibold">{summaryMine.find((m)=> m.title.toLowerCase()===c.title.toLowerCase())?.count || 0}</span>
              </CardBody>
            </Card>
          ))}
          {!summary.length && (
            <div className="text-small text-default-500">Tidak ada data</div>
          )}
        </div>
      </div>

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
                    <div className="flex flex-col items-center gap-2">
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
