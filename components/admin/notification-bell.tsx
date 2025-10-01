"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { Card } from "@heroui/card";
import { Badge } from "@heroui/badge";
import { FiBell } from "react-icons/fi";
import api from "@/lib/api";

type Notif = { id: string; title: string; message?: string | null; url?: string | null; readAt?: string | null; createdAt: string };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const fetchList = async () => {
    try {
      const d = await api.get<{ notifications: any[]; unread: number }>("/api/notifications");
      setList((d.notifications || []).map((n) => ({ id: n.id, title: n.title, message: n.message, url: n.url, readAt: n.readAt, createdAt: n.createdAt })));
      setUnread(d.unread || 0);
    } catch {}
  };

  useEffect(() => {
    fetchList();
    try { esRef.current?.close(); } catch {}
    const es = new EventSource(`/api/events?user=me`, { withCredentials: true } as any);
    esRef.current = es;
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data);
        if (evt.type === 'notification' && evt.notification) {
          setList((prev) => [{ id: evt.notification.id, title: evt.notification.title, message: evt.notification.message, url: evt.notification.url, createdAt: evt.notification.createdAt }, ...prev]);
          setUnread((u) => u + 1);
        }
      } catch {}
    };
    es.onerror = () => { try { es.close(); } catch {}; esRef.current = null; }
    return () => { try { es.close(); } catch {}; esRef.current = null; };
  }, []);

  const onMarkRead = async (id?: string) => {
    try {
      if (id) await api.post("/api/notifications/mark-read", { ids: [id] });
      else await api.post("/api/notifications/mark-read", { all: true });
      fetchList();
      if (id) setUnread((u) => Math.max(0, u - 1));
      else setUnread(0);
    } catch {}
  };

  const items = useMemo(() => list.slice(0, 20), [list]);

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="top-end">
      <PopoverTrigger>
        <div className="fixed bottom-6 right-6 z-50" onClick={() => setOpen((v) => !v)}>
          <Badge color="danger" content={unread > 99 ? '99+' : unread} shape="circle">
            <Button isIconOnly radius="full" onPress={() => setOpen((v) => !v)} variant="light" aria-label="Notification" className="shadow-lg rounded-full">
              <FiBell size={22} />
            </Button>
          </Badge>
        </div>
      </PopoverTrigger>
      <PopoverContent className="border-none bg-content1 rounded-2xl p-2 shadow-large">
        <div className="p-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Notifikasi</span>
            {items.length > 0 && (
              <Button size="sm" variant="light" onPress={() => onMarkRead()}>
                Tandai dibaca
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-auto no-scrollbar flex flex-col gap-1">
            {items.map((n) => (
              <div key={n.id} className="rounded-md p-2 hover:bg-default-100 transition-colors">
                <div className="text-small font-medium">{n.title}</div>
                {n.message && <div className="text-tiny text-default-500">{n.message}</div>}
                <div className="flex justify-end gap-2 mt-1">
                  {n.url && (
                    <Button size="sm" variant="light" onPress={() => { try { window.location.href = n.url!; } catch {} }}>
                      Buka
                    </Button>
                  )}
                  <Button size="sm" variant="flat" onPress={() => onMarkRead(n.id)}>Tandai dibaca</Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-small text-default-500 p-2">Tidak ada notifikasi</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
