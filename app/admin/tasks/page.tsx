"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useRouter } from "next/navigation";
import { FiFolder } from "react-icons/fi";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";

type Row = {
  id: string;
  title: string;
  progress?: number | null;
  dueDate?: string | null;
  column: string;
  workspace: { slug: string; name: string };
};

export default function MyTasksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/my-tasks?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(debouncedQ)}`, { credentials: "include" });
        const data = await res.json();
        setRows(data.tasks ?? []);
        setTotalPages(data.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, debouncedQ]);

  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString() : "-");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-semibold">Tugas Saya</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Cari tugas..." size="sm" value={q} onValueChange={setQ} className="w-64" />
          <select className="border rounded-md px-2 py-1 text-sm" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <Table aria-label="Tugas saya">
        <TableHeader>
          <TableColumn>Tugas</TableColumn>
          <TableColumn>Workspace</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Jatuh Tempo</TableColumn>
          <TableColumn>Aksi</TableColumn>
        </TableHeader>
        <TableBody isLoading={loading} emptyContent={loading ? "Memuat..." : "Tidak ada tugas"}>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.workspace.name}</TableCell>
              <TableCell>{r.column}</TableCell>
              <TableCell>{fmt(r.dueDate)}</TableCell>
              <TableCell>
                <Button isIconOnly size="sm" variant="flat" aria-label="Buka workspace" onPress={() => router.push(`/admin/workspace/${r.workspace.slug}?task=${r.id}`)}>
                  <FiFolder />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-4">
        <Pagination page={page} total={totalPages} onChange={setPage} showControls size="sm" />
      </div>
    </div>
  );
}

// small debounce hook
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
