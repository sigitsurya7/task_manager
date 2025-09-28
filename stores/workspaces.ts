"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import { toast } from "react-hot-toast";

export type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  iconKey?: string | null;
  role: "ADMIN" | "MEMBER" | "VIEWER";
};

type State = {
  items: WorkspaceItem[];
  loading: boolean;
  fetch: () => Promise<void>;
  add: (data: { name: string; slug: string; iconKey?: string }) => Promise<void>;
};

export const useWorkspaces = create<State>((set, get) => ({
  items: [],
  loading: false,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data } = await api.get("/api/workspaces");
      set({ items: data.workspaces ?? [] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal memuat workspaces");
    } finally {
      set({ loading: false });
    }
  },
  add: async (payload) => {
    try {
      const { data } = await api.post("/api/workspaces", payload);
      set({ items: [...get().items, data.workspace] });
      toast.success("Workspace dibuat");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal membuat workspace");
    }
  },
}));

