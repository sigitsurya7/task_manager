"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import api from "@/lib/api";
// import { Button } from "@heroui/button";

function addMonths(d: Date, m: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + m);
  return nd;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function dateKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MonthCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [me, setMe] = useState<{ id: string; username?: string; name?: string | null } | null>(null);
  const [dueMap, setDueMap] = useState<Record<string, { id: string; title: string; progress?: number | null; column?: string; workspace?: { name: string; slug: string } }[]>>({});
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = (first.getDay() + 7) % 7; // 0=Sun
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const days = last.getDate();
    const cells: { key: string; label: string; dim?: boolean; date: Date }[] = [];
    // prev month fill
    const prevLast = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevLast - i;
      cells.push({ key: `p-${i}`, label: String(day), dim: true, date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, day) });
    }
    // current month
    for (let d = 1; d <= days; d++) cells.push({ key: `c-${d}`, label: String(d), date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
    // next month fill to complete 6 rows
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ key: `n-${cells.length}`, label: String(nextDay), dim: true, date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, nextDay) });
      nextDay++;
    }
    while (cells.length < 42) {
      cells.push({ key: `n2-${cells.length}`, label: String(nextDay), dim: true, date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, nextDay) });
      nextDay++;
    }
    return cells;
  }, [cursor]);

  // Load current user and my tasks for this month
  useEffect(() => {
    (async () => {
      try {
        const md = await api.get<{ user?: any }>("/api/auth/me");
        setMe(md?.user ?? null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const res = await api.get<{ tasks: { id: string; title: string; progress?: number | null; dueDate?: string | null; column: string; workspace: { name: string; slug: string } }[] }>(`/api/my-tasks?page=1&pageSize=1000&q=`);
        const m: Record<string, any[]> = {};
        (res.tasks || []).forEach((t) => {
          if (!t.dueDate) return;
          const d = new Date(t.dueDate);
          if (d < start || d > end) return;
          const key = dateKeyLocal(d);
          (m[key] = m[key] || []).push(t);
        });
        setDueMap(m);
      } catch {}
    })();
  }, [cursor]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const todayKey = dateKeyLocal(new Date());

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <Button size="sm" variant="light" onPress={() => setCursor((c) => addMonths(c, -1))}>
            <FiArrowLeft className="text-xl" />
          </Button>
          <div className="font-medium">{monthLabel}</div>
          <Button size="sm" variant="light" onPress={() => setCursor((c) => addMonths(c, 1))}>
            <FiArrowRight className="text-xl" />
          </Button>
        </CardHeader>
        <CardBody>  
          <div className="flex items-center justify-between mb-3">
          </div>
          <div className="grid grid-cols-7 gap-2 text-tiny text-default-500 mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {grid.map((c) => {
              const key = dateKeyLocal(c.date);
              const tasks = dueMap[key] || [];
              const isToday = key === todayKey;
              const isOverdue = tasks.some((t) => {
                const due = new Date(key);
                const now = new Date();
                const incomplete = (t.column || "").toLowerCase() !== "complete" && (typeof t.progress !== "number" || t.progress < 100);
                return incomplete && due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
              });
              const base = c.dim ? "text-default-400" : isToday ? "bg-primary text-white" : isOverdue ? "bg-danger-100" : "bg-default-100";
              return (
                <button
                  key={c.key}
                  onClick={() => { if (tasks.length) { setSelectedDate(c.date); setOpen(true); } }}
                  className={`h-10 rounded-md text-center text-sm flex flex-col items-center justify-center relative ${base}`}
                  aria-label={`Tanggal ${c.label}`}
                >
                  <span>{c.label}</span>
                  {tasks.length > 0 && me && (
                    <span className="absolute bottom-0.5 right-0.5">
                      <Avatar name={me.name || me.username || 'Me'} size="sm" className="w-5 h-5 text-[10px] ring-1 ring-background" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          {() => (
            <div className="p-6">
              <ModalHeader className="p-0 mb-2">Tenggat {selectedDate ? selectedDate.toLocaleDateString() : ""}</ModalHeader>
            <div className="space-y-2">
              {(dueMap[selectedDate ? dateKeyLocal(selectedDate) : ""] || []).map((t) => (
                <div key={t.id} className="rounded-lg border border-default-200 p-3">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-tiny text-default-500 mb-2">{t.workspace?.name} • Status: {t.column}</div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="light" onPress={() => { try { window.location.href = `/admin/workspace/${t.workspace?.slug}?task=${t.id}`; } catch {} }}>Buka</Button>
                  </div>
                </div>
              ))}
                {!(dueMap[selectedDate ? dateKeyLocal(selectedDate) : ""] || []).length && (
                  <div className="text-small text-default-500">Tidak ada tugas jatuh tempo.</div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="light" onPress={() => setOpen(false)}>Tutup</Button>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default MonthCalendar;
