"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import { toast } from "react-hot-toast";

export type BoardTask = {
  id: string;
  title: string;
  progress: number;
  dueDate?: string | null;
  tags?: { id: string; name: string; color: string }[];
  assignees?: { id: string; name: string | null; username: string }[];
};

export type BoardColumn = {
  id: string;
  title: string;
  accent?: string | null;
  tasks: BoardTask[];
};

type State = {
  workspaceSlug: string | null;
  boardId: string | null;
  workspaceRole: "ADMIN" | "MEMBER" | "VIEWER" | null;
  columns: BoardColumn[];
  loading: boolean;
  es?: EventSource | null;
  loadAbort?: AbortController | null;
  load: (slug: string) => Promise<void>;
  addTask: (columnId: string, title: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, position: number) => Promise<void>;
  connectSSE: () => void;
  replaceColumns: (cols: BoardColumn[]) => void;
  // task-level event subscriptions for TaskDetail
  taskSubs: Record<string, Set<(evt: any) => void>>;
  subscribeTask: (taskId: string, fn: (evt: any) => void) => () => void;
  notifyTask: (taskId: string, evt: any) => void;
};

export const useBoard = create<State>((set, get) => ({
  workspaceSlug: null,
  boardId: null,
  workspaceRole: null,
  columns: [],
  loading: false,
  loadAbort: null,
  taskSubs: {},
  subscribeTask: (taskId, fn) => {
    const subs = { ...get().taskSubs };
    if (!subs[taskId]) subs[taskId] = new Set();
    subs[taskId].add(fn);
    set({ taskSubs: subs });
    return () => {
      const cur = get().taskSubs;
      if (cur[taskId]) {
        cur[taskId].delete(fn);
        if (cur[taskId].size === 0) delete cur[taskId];
        set({ taskSubs: { ...cur } });
      }
    };
  },
  notifyTask: (taskId, evt) => {
    const subs = get().taskSubs;
    const setSubs = subs[taskId];
    if (setSubs) {
      setSubs.forEach((fn) => {
        try { fn(evt); } catch {}
      });
    }
  },
  replaceColumns: (cols) => set({ columns: cols }),
  load: async (slug) => {
    // Abort any previous in-flight load
    try { get().loadAbort?.abort(); } catch {}
    const ctr = new AbortController();
    set({ loading: true, loadAbort: ctr });
    try {
      const { data } = await api.get(`/api/board/${slug}`, { signal: ctr.signal } as any);
      set({ workspaceSlug: slug, boardId: data.board.id, columns: data.columns, workspaceRole: data.workspace?.role ?? null });
      get().connectSSE();
    } catch (e: any) {
      // Ignore abort errors; surface other errors
      if (e?.name !== 'CanceledError' && e?.message !== 'canceled') {
        toast.error(e?.response?.data?.message ?? "Gagal memuat board");
      }
    } finally {
      set({ loading: false, loadAbort: null });
    }
  },
  addTask: async (columnId, title) => {
    try {
      const { data } = await api.post(`/api/tasks`, { columnId, title });
      set((s) => {
        const exists = s.columns.some((c) => c.tasks.some((t) => t.id === data.task.id));
        if (exists) return s;
        return {
          columns: s.columns.map((c) => (c.id === columnId ? { ...c, tasks: [{ id: data.task.id, title: data.task.title, progress: data.task.progress ?? 0, dueDate: data.task.dueDate ?? null }, ...c.tasks] } : c)),
        };
      });
      // sync ulang agar urutan/state pasti benar
      const slug = get().workspaceSlug;
      if (slug) {
        const { data: fresh } = await api.get(`/api/board/${slug}`);
        set({ columns: fresh.columns });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal menambah task");
    }
  },
  moveTask: async (taskId, toColumnId, position) => {
    try {
      await api.patch(`/api/tasks/${taskId}/move`, { toColumnId, position });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal memindahkan task");
    }
  },
  connectSSE: () => {
    if (typeof window === "undefined") return;
    const slug = get().workspaceSlug;
    if (!slug) return;
    try { get().es?.close(); } catch {}
    const url = `/api/events?workspace=${encodeURIComponent(slug)}`;
    const es = new EventSource(url, { withCredentials: true } as any);
    set({ es });
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data);
        if (evt.type === "task.created" && evt.task) {
          set((s) => {
            // avoid dup if already exists
            if (s.columns.some((c) => c.tasks.some((t) => t.id === evt.task.id))) return s;
            return {
              columns: s.columns.map((c) => (c.id === evt.task.columnId ? { ...c, tasks: [{ id: evt.task.id, title: evt.task.title, progress: evt.task.progress ?? 0, dueDate: evt.task.dueDate ?? null }, ...c.tasks] } : c)),
            };
          });
        }
        if (evt.type === "task.updated" && evt.task) {
          // ignore nudge events
          if (typeof evt.task.id === 'string' && evt.task.id.startsWith('__')) return;
          // fetch fresh task details to update assignees/labels/dates accurately
          (async () => {
            try {
              const { data } = await api.get(`/api/tasks/${evt.task.id}`);
              set((s) => ({
                columns: s.columns.map((c) => ({
                  ...c,
                  tasks: c.tasks.map((t) =>
                    t.id === data.id
                      ? { ...t, title: data.title ?? t.title, progress: typeof data.progress === 'number' ? data.progress : t.progress, dueDate: typeof data.dueDate !== 'undefined' ? data.dueDate : t.dueDate, assignees: data.assignees ?? t.assignees }
                      : t,
                  ),
                })),
              }));
              get().notifyTask(data.id, { type: 'task.updated', task: { id: data.id } });
            } catch {
              // fallback: apply any partial payload updates
              set((s) => ({
                columns: s.columns.map((c) => ({
                  ...c,
                  tasks: c.tasks.map((t) => (t.id === evt.task.id ? { ...t, title: evt.task.title ?? t.title, progress: typeof evt.task.progress === 'number' ? evt.task.progress : t.progress, dueDate: typeof evt.task.dueDate !== 'undefined' ? evt.task.dueDate : t.dueDate } : t)),
                })),
              }));
              get().notifyTask(evt.task.id, evt);
            }
          })();
        }
        if (evt.type === 'comment.created' && evt.taskId) {
          get().notifyTask(evt.taskId, evt);
        }
        if (evt.type === "task.moved") {
          set((s) => {
            // find task object
            const fromColIdx = s.columns.findIndex((c) => c.tasks.some((t) => t.id === evt.taskId));
            if (fromColIdx === -1) return s;
            const currentColumnId = s.columns[fromColIdx].id;
            if (currentColumnId === evt.toColumnId) return s; // already moved locally
            const fromCol = s.columns[fromColIdx];
            const task = fromCol.tasks.find((t) => t.id === evt.taskId);
            if (!task) return s;
            const cols = s.columns.map((c, i) =>
              i === fromColIdx ? { ...c, tasks: c.tasks.filter((t) => t.id !== evt.taskId) } : c,
            );
            const toIdx = cols.findIndex((c) => c.id === evt.toColumnId);
            if (toIdx === -1) return { columns: cols } as any;
            const toCol = cols[toIdx];
            if (toCol.tasks.some((t) => t.id === evt.taskId)) return { columns: cols } as any;
            const newTasks = [task, ...toCol.tasks];
            cols[toIdx] = { ...toCol, tasks: newTasks };
            return { columns: cols } as any;
          });
        }
        if (evt.type === "workspace.members.changed") {
          const slug = get().workspaceSlug;
          if (!slug) return;
          (async () => {
            try {
              const [meRes, memRes] = await Promise.all([
                api.get(`/api/auth/me`),
                api.get(`/api/workspaces/${slug}/members`),
              ]);
              const myId = meRes.data?.user?.id;
              const members = memRes.data?.members || [];
              const me = members.find((m: any) => m.user?.id === myId);
              if (me?.role) set({ workspaceRole: me.role });
            } catch {}
          })();
        }
        if (evt.type === "task.deleted" && evt.taskId) {
          set((s) => ({
            columns: s.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== evt.taskId) })),
          }));
          get().notifyTask(evt.taskId, evt);
        }
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
      set({ es: null });
      setTimeout(() => {
        if (get().workspaceSlug === slug) get().connectSSE();
      }, 3000);
    };
  },
}));
