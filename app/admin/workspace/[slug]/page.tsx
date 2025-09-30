"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "react-hot-toast";
import { useBoard } from "@/stores/board";
import { useWorkspaces } from "@/stores/workspaces";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Input, Textarea } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { FiFile, FiList, FiMenu, FiPlus, FiSave, FiTable, FiTrash2 } from "react-icons/fi";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { RiFileExcel2Fill, RiFilePdf2Fill } from "react-icons/ri";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Skeleton } from "@heroui/skeleton";
import { Select, SelectItem } from "@heroui/select";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

type Task = {
  id: string;
  is_complete?: boolean;
  title: string;
  progress?: number;
  dueDate?: string | null;
  startDate?: string | null;
  tags?: { id: string; name: string; color: string }[];
  assignees?: { id: string; name: string | null; username: string }[];
};
type ColumnData = { id: string; title: string; accent?: string | null; tasks: Task[] };

function formatDaysLeft(dueDate?: string | null) {
  if (!dueDate) return "";
  const now = new Date();
  const due = new Date(dueDate);
  const ms = due.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days) || days < 0) return "";
  return `${days} hari lagi`;
}

// simple runtime cache for workspace members per slug
const __membersCache: Map<string, { id: string; email: string; username: string; name: string | null; role: string }[]> = new Map();

function TaskCard({ id, title, progress, tags, assignees, dueDate, is_complete, onOpen }: Task & { onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 50 : "auto",
  } as CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        isPressable
        shadow="sm"
        className="border border-default-200 hover:border-primary w-full cursor-grab active:cursor-grabbing touch-none select-none"
        onPress={() => { if (!isDragging) onOpen(); }}
        {...listeners}
      >
        {/* Stacked labels (max 3) */}
        {tags && tags.length > 0 ? (
          <div className="px-4 pt-3">
            <div className="flex -space-x-2">
              {tags.slice(0, 3).map((tg) => (
                <span key={tg.id} className="inline-flex items-center rounded-full bg-primary text-white dark:text-default-700 px-2 py-0.5 text-tiny ring-2 ring-background">
                  {tg.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <CardBody className="gap-3">
          <p className="font-medium text-default-800">{title}</p>
          {(assignees && assignees.length > 0) || formatDaysLeft(dueDate) ? (
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {(assignees ?? []).slice(0, 3).map((a) => (
                  <Avatar key={a.id} size="sm" name={a.name ?? a.username} className="ring-2 ring-background" />
                ))}
              </div>
              { is_complete ? <span className="text-tiny text-default-500">Selesai</span> :formatDaysLeft(dueDate) ? (
                <span className="text-tiny text-default-500">{formatDaysLeft(dueDate)}</span>
              ) : <span />}
          </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

// Subcomponents for TaskDetail sections
function DescriptionSection({ desc, setDesc, isViewer, onSave, saving }: { desc: string; setDesc: (v: string) => void; isViewer: boolean; onSave: () => void; saving?: boolean }) {
  return (
    <div className="mt-6">
      <p className="text-small text-default-500">Deskripsi</p>
      <Textarea
        className="mt-2"
        minRows={4}
        variant="bordered"
        placeholder="Tambahkan deskripsi yang lebih detail..."
        value={desc}
        onValueChange={setDesc}
        isReadOnly={isViewer}
      />
      {!isViewer && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" color="primary" onPress={onSave} isLoading={!!saving}>Simpan</Button>
        </div>
      )}
    </div>
  );
}

function AttachmentsSection({ attachments, isViewer, onOpenPreview, onDelete }: { attachments: { id: string; name: string; url: string; type: string }[]; isViewer: boolean; onOpenPreview: (a: any) => void; onDelete: (id: string) => void }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-6">
      <p className="text-small text-default-500 mb-2">Attachments</p>
      <div className="overflow-x-auto rounded-lg border border-default-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-content2 text-default-500">
              <th className="text-left px-3 py-2">Nama</th>
              <th className="text-left px-3 py-2">Tipe</th>
              <th className="text-right px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((a) => {
              const isImage = a.type?.startsWith('image/');
              const isPdf = a.type === 'application/pdf' || a.url.toLowerCase().endsWith('.pdf');
              const isLink = a.type === 'link' || /^https?:\/\//i.test(a.url);
              const handleOpen = () => {
                if (isLink && !isImage && !isPdf) { window.open(a.url, '_blank', 'noopener,noreferrer'); return; }
                onOpenPreview(a);
              };
              return (
                <tr key={a.id} className="border-t border-default-200">
                  <td className="px-3 py-2"><button className="text-primary hover:underline" onClick={handleOpen} aria-label={`Open attachment ${a.name}`}>{a.name}</button></td>
                  <td className="px-3 py-2">{a.type || 'file'}</td>
                  <td className="px-3 py-2 text-right">
                    {!isViewer && (
                        <Button size="sm" variant="light" color="danger" onPress={()=>onDelete(a.id)} aria-label="Hapus lampiran">Hapus</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommentsSection({ me, isViewer, comment, setComment, comments, onSubmit, onDelete, onPasteFile }: { me: any; isViewer: boolean; comment: string; setComment: (v: string) => void; comments: any[]; onSubmit: () => void; onDelete: (id: string) => void; onPasteFile: (f: File) => void }) {
  return (
    <div>
      <ModalHeader className="p-0">Komentar dan aktivitas</ModalHeader>
      <div className="mt-3 space-y-3">
        <div className="flex flex-col">
          <Textarea
            placeholder="Tulis komentar..."
            value={comment}
            onChange={(e)=>setComment(e.target.value)}
            onPaste={(e)=>{ const items = e.clipboardData?.files; if(items && items.length){ onPasteFile(items[0]); } }}
            aria-label="Tulis komentar"
          />
          {!isViewer && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" className="w-max" color="primary" onPress={onSubmit}>Simpan</Button>
            </div>
          )}
        </div>
        <div className="overflow-y-auto max-h-96 no-scrollbar flex flex-col gap-2">
          {comments?.length ? comments.map((c)=> (
            <div key={c.id} className="flex gap-3 items-start rounded-xl border border-default-200 p-3">
              <div className="col-span-1">
                <Avatar name={c.author?.name ?? c.author?.username ?? 'U'} size="sm" />
              </div>
              <div className="flex-1 col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-small"><span className="font-medium">{c.author?.name ?? c.author?.username ?? 'User'}</span></p>
                    <p className="text-tiny text-default-500">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  {me && c.author?.id === me.id && (
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={()=>onDelete(c.id)} aria-label="Delete comment">
                      <FiTrash2 />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          )) : null}
        </div>
      </div>
    </div>
  );
}

function TaskDetail({ task, columnTitle, columnAccent, slug, role, onClose, onChanged }: { task: Task | null; columnTitle: string; columnAccent?: string | null; slug: string; role: "ADMIN" | "MEMBER" | "VIEWER" | null; onClose: () => void; onChanged: () => void }) {
  const isViewer = role === "VIEWER";
  const [desc, setDesc] = useState("");
  const [titleEdit, setTitleEdit] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [due, setDue] = useState<string>("");
  const [members, setMembers] = useState<{ id: string; email: string; username: string; name: string | null; role: string }[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#16a34a");
  const [checklists, setChecklists] = useState<{ id: string; title: string; items: { id: string; title: string; done: boolean }[] }[]>([]);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; type: string }[]>([]);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [me, setMe] = useState<{ id: string; username?: string; name?: string } | null>(null);
  const [checklistModal, setChecklistModal] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("Checklist");
  const [attachModal, setAttachModal] = useState(false);
  const [preview, setPreview] = useState<{ open: boolean; att: { id: string; name: string; url: string; type: string } | null }>({ open: false, att: null });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLink, setPendingLink] = useState("");
  const [pendingDisplay, setPendingDisplay] = useState("");
  const [memberModal, setMemberModal] = useState(false);
  const [labelModal, setLabelModal] = useState(false);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [labelQuery, setLabelQuery] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string; selected?: boolean }[]>([]);
  const selectedLabels = useMemo(() => allLabels.filter((l) => l.selected), [allLabels]);
  const [assigneesLocal, setAssigneesLocal] = useState<{ id: string; name: string | null; username: string }[]>([]);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message?: string; onConfirm: null | (() => void | Promise<void>) }>({ open: false, title: "", message: "", onConfirm: null });
  const [startEnabled, setStartEnabled] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!task) return;
    setLoading(true);
    setDue(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setStartEnabled(Boolean(task.startDate));
    setStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : "");
    setTitleEdit(task.title || "");
    setSelectedMemberIds(new Set((task.assignees ?? []).map((a)=>a.id)));
    setAssigneesLocal([...(task.assignees ?? [])]);

    let alive = true;

    (async () => {
      try {
        const meRes = await fetch(`/api/auth/me`, { credentials: 'include' });
        const md = await meRes.json().catch(()=>null);
        if (alive) setMe(md?.user ?? null);
      } catch {}
      try {
        const taskRes = await fetch(`/api/tasks/${task.id}`, { credentials: 'include' });
        if (taskRes.ok) {
          const d = await taskRes.json();
          if (alive) setDesc(d.description || "");
        } else if (alive) {
          setDesc("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    (async () => {
      try {
        const cached = __membersCache.get(slug);
        if (cached) { if (alive) setMembers(cached); return; }
        const res = await fetch(`/api/workspaces/${slug}/members`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const mem = data.members.map((m: any) => ({ ...m.user, role: m.role }));
          __membersCache.set(slug, mem);
          if (alive) setMembers(mem);
        }
      } catch {}
    })();

    (async () => {
      try {
        const r = await fetch(`/api/tasks/${task.id}/checklists`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          if (alive) setChecklists((d.checklists||[]).map((cl:any)=>({id:cl.id,title:cl.title,items:(cl.items||[]).map((it:any)=>({id:it.id,title:it.title,done:!!it.done}))})));
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch(`/api/tasks/${task.id}/labels`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          if (alive) setAllLabels(d.labels||[]);
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch(`/api/tasks/${task.id}/attachments`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          if (alive) setAttachments((d.attachments||[]).map((a:any)=>({id:a.id,name:a.name,url:a.url,type:a.type||'file'})));
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch(`/api/comments?taskId=${task.id}`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          if (alive) setComments(d.comments || []);
        } else if (alive) {
          setComments([]);
        }
      } catch { if (alive) setComments([]); }
    })();

    return () => { alive = false; };
  }, [task, slug]);

  // Realtime: listen SSE and refresh TaskDetail sections when related events arrive
  useEffect(() => {
    if (!task) return;
    let es: EventSource | null = null;
    const refresh = async () => {
      try {
        const [tRes, cRes, aRes, lRes] = await Promise.all([
          fetch(`/api/tasks/${task.id}`, { credentials: 'include' }),
          fetch(`/api/comments?taskId=${task.id}`, { credentials: 'include' }),
          fetch(`/api/tasks/${task.id}/attachments`, { credentials: 'include' }),
          fetch(`/api/tasks/${task.id}/labels`, { credentials: 'include' }),
        ]);
        if (tRes.ok) { const d = await tRes.json(); setDesc(d.description || ""); setAssigneesLocal(d.assignees || []); setSelectedMemberIds(new Set((d.assignees||[]).map((a:any)=>a.id))); }
        if (cRes.ok) { const d = await cRes.json(); setComments(d.comments || []); }
        if (aRes.ok) { const d = await aRes.json(); setAttachments((d.attachments||[]).map((a:any)=>({id:a.id,name:a.name,url:a.url,type:a.type||'file'}))); }
        if (lRes.ok) { const d = await lRes.json(); setAllLabels(d.labels||[]); }
      } catch {}
    };
    try {
      es = new EventSource(`/api/events?workspace=${encodeURIComponent(slug)}`, { withCredentials: true } as any);
      es.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          if ((evt.type === 'task.updated' && evt.task && evt.task.id === task.id) ||
              (evt.type === 'comment.created' && evt.taskId === task.id)) {
            refresh();
          }
          if (evt.type === 'workspace.members.changed') {
            // refresh members list used by TaskDetail dialogs
            (async () => {
              try {
                const res = await fetch(`/api/workspaces/${slug}/members`, { credentials: 'include' });
                if (res.ok) {
                  const data = await res.json();
                  const mem = (data.members||[]).map((m:any)=> ({ ...m.user, role: m.role }));
                  try { __membersCache.set(slug, mem); } catch {}
                  setMembers(mem);
                }
              } catch {}
            })();
          }
          if (evt.type === 'task.deleted' && evt.taskId === task.id) {
            // task removed by others; close the modal gracefully
            onClose();
          }
        } catch {}
      };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [task, slug]);

  // Control initial state of create-label UI based on whether labels exist
  useEffect(() => {
    if (!labelModal) return;
    if (allLabels.length === 0) setShowCreateLabel(true);
    else setShowCreateLabel(false);
  }, [labelModal, allLabels.length]);

  // removed duplicate comments fetch effect (handled in main effect progressively)

  if (!task) return null;

  const saveDesc = async () => {
    if (isViewer) return;
    try {
      setSavingDesc(true);
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: desc }) });
      if (!res.ok) throw new Error('Failed');
      onChanged();
      toast.success('Berhasil menyimpan deskripsi');
    } catch {
      toast.error('Gagal menyimpan deskripsi');
    } finally {
      setSavingDesc(false);
    }
  };
  const [savingTitle, setSavingTitle] = useState(false);
  const saveTitle = async () => {
    if (isViewer || !titleEdit.trim()) return;
    try {
      setSavingTitle(true);
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleEdit.trim() }) });
      if (!res.ok) throw new Error('Failed');
      setIsEditingTitle(false);
      onChanged();
      toast.success('Judul berhasil disimpan');
    } catch {}
    finally { setSavingTitle(false); }
  };
  const requestDeleteTask = () => {
    setConfirm({
      open: true,
      title: 'Hapus task?',
      message: 'Semua data terkait (komentar, checklist, lampiran) akan dihapus.',
      onConfirm: async () => {
        try { await fetch(`/api/tasks/${task.id}`, { method: 'DELETE', credentials: 'include' }); } catch {}
        onClose();
        onChanged();
      },
    });
  };
  const saveDue = async (val: string) => {
    if (isViewer) return;
    try {
      setDue(val);
      await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dueDate: val ? new Date(val).toISOString() : null }) });
      onChanged();
    } catch {}
  };
  const addAssignee = async () => {
    if (isViewer || !selectedMember) return;
    try {
      await fetch(`/api/tasks/${task.id}/assignees`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selectedMember }) });
      setSelectedMember(null);
      setAddMemberOpen(false);
      onChanged();
    } catch {}
  };
  const addLabel = async () => {
    if (isViewer || !labelName.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}/labels`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: labelName.trim(), color: labelColor }) });
      setLabelName("");
      onChanged();
    } catch {}
  };

  const addChecklistGroup = async () => {
    if (!checklistTitle.trim() || !task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/checklists`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: checklistTitle.trim() })
      });
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setChecklists((arr) => [{ id: d.checklist.id, title: d.checklist.title, items: [] }, ...arr]);
      setChecklistTitle("Checklist");
      setChecklistModal(false);
      toast.success('Checklist ditambahkan');
    } catch {
      toast.error('Gagal menambah checklist');
    }
  };
  const addChecklistItem = async (groupId: string) => {
    const title = (newItem[groupId] || "").trim();
    if (!title) return;
    try {
      const res = await fetch(`/api/checklists/${groupId}/items`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setChecklists((arr) => arr.map((g) => g.id === groupId ? { ...g, items: [{ id: d.item.id, title: d.item.title, done: !!d.item.done }, ...g.items] } : g));
      setNewItem((m) => ({ ...m, [groupId]: "" }));
    } catch {
      toast.error('Gagal menambah item');
    }
  };
  // debounce map for checklist item title updates
  const itemTimers = useRef<Record<string, any>>({});
  const addAttachmentFile = async (file: File) => {
    if (!task) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`/api/tasks/${task.id}/attachments`, { method:'POST', credentials:'include', body: fd });
      if (!r.ok) throw new Error('upload failed');
      const d = await r.json();
      setAttachments((arr)=>[{ id: d.attachment.id, name: d.attachment.name, url: d.attachment.url, type: d.attachment.type || 'file' }, ...arr]);
    } catch {}
  };
  const addAttachmentLink = async (link: string, display?: string) => {
    if (!task) return;
    try {
      const r = await fetch(`/api/tasks/${task.id}/attachments`, { method:'POST', credentials:'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ link, display }) });
      if (!r.ok) throw new Error('link failed');
      const d = await r.json();
      setAttachments((arr)=>[{ id: d.attachment.id, name: d.attachment.name, url: d.attachment.url, type: d.attachment.type || 'link' }, ...arr]);
    } catch {}
  };
  const deleteAttachment = async (id: string) => {
    try {
      await fetch(`/api/attachments/${id}`, { method:'DELETE', credentials:'include' });
      setAttachments((arr)=>arr.filter((x)=>x.id!==id));
    } catch {}
  };
  const submitComment = async () => {
    if (!comment.trim()) return;
    try {
      await fetch(`/api/comments`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id, body: comment }) });
      setComment("");
    } catch {}
  };
  const deleteComment = async (id: string) => {
    try {
      const r = await fetch(`/api/comments/${id}`, { method:'DELETE', credentials:'include' });
      if (!r.ok) throw new Error('Failed');
      setComments((arr)=>arr.filter((c)=>c.id!==id));
      toast.success('Komentar dihapus');
    } catch {
      toast.error('Gagal menghapus komentar');
    }
  };

  if (loading) {
    return (
      <>
        <div className="grid w-full grid-cols-1 gap-6 p-8 md:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-xl col-span-1" />
              <Skeleton className="h-16 rounded-xl col-span-1" />
              <Skeleton className="h-16 rounded-xl col-span-1" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
          <div>
            <Skeleton className="h-5 w-40 rounded mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_,i)=>(<Skeleton key={i} className="h-16 rounded-xl" />))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="grid w-full grid-cols-1 gap-6 p-8 md:grid-cols-[1fr_360px]">
      <div>
        <ModalHeader className="flex items-center justify-between gap-3 p-0">
          {(() => {
            const acc = columnAccent ?? '';
            const light = /-100|-200|-300|warning|default/i.test(acc);
            const text = light ? 'text-black' : 'text-white';
            return <Chip variant="flat" className={`${acc} ${acc ? text : ''}`}>{columnTitle}</Chip>;
          })()}
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input size="sm" variant="bordered" value={titleEdit} onValueChange={setTitleEdit} onKeyDown={(e)=>{ if(e.key==='Enter') saveTitle(); if(e.key==='Escape'){ setIsEditingTitle(false); setTitleEdit(task.title);} }} />
              <Button size="sm" color="primary" onPress={saveTitle} isDisabled={!titleEdit.trim()} isLoading={savingTitle}>Save</Button>
              <Button size="sm" variant="light" onPress={()=>{ setIsEditingTitle(false); setTitleEdit(task.title); }}>Cancel</Button>
            </div>
          ) : (
            <h2 className={`text-2xl font-semibold ${!isViewer ? 'cursor-text' : ''}`} onClick={()=>{ if (!isViewer) setIsEditingTitle(true); }}>{task.title}</h2>
          )}

          {!isViewer && (
            <Dropdown>
              <DropdownTrigger>
                <Button size="sm" isIconOnly variant="light" aria-label="Menu task"><FiMenu /></Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="task menu" onAction={(key)=>{ if (key === 'delete') requestDeleteTask(); }}>
                <DropdownItem key="delete" className="text-danger" color="danger">Delete task</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </ModalHeader>
            <div className="mt-4 flex flex-wrap gap-2">
          {!isViewer && <Button size="sm" variant="flat" color="secondary" onPress={() => setChecklistModal(true)}>Daftar Periksa</Button>}
          {!isViewer && <Button size="sm" variant="flat" color="success" onPress={() => setAttachModal(true)}>Lampiran</Button>}
          </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-tiny text-default-500">Anggota</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {assigneesLocal.map((m) => (
                <Avatar key={m.id} name={m.name ?? m.username} size="sm" className="ring-2 ring-background" />
              ))}
              {!isViewer && (
                <Button isIconOnly size="sm" variant="light" onPress={() => setMemberModal(true)} aria-label="Manage members">+</Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-tiny text-default-500">Label</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2">
                {selectedLabels.slice(0,3).map((l) => (
                  <span key={l.id} className="inline-flex items-center rounded-full bg-primary text-white dark:text-default-700 px-2 py-0.5 text-tiny">
                    {l.name}
                  </span>
                ))}
              </div>
              {!isViewer && <Button isIconOnly size="sm" variant="light" onPress={()=>setLabelModal(true)} aria-label="Manage labels">+</Button>}
            </div>
          </div>
          <div>
            <p className="text-tiny text-default-500">Batas waktu</p>
            <div className="mt-2">
              <Button variant="bordered" size="sm" onPress={()=>setDateModal(true)} disabled={isViewer}>{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Set dates'}</Button>
            </div>
          </div>
        </div>

        <DescriptionSection desc={desc} setDesc={setDesc} isViewer={isViewer} onSave={saveDesc} saving={savingDesc} />

        {/* Checklist groups */}
        {checklists.map((g) => {
          const total = g.items.length || 1;
          const done = g.items.filter((i) => i.done).length;
          const percent = Math.round((done / total) * 100);
          return (
            <div key={g.id} className="mt-6 border border-default-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{g.title}</p>
                {!isViewer && <Button size="sm" variant="light" color="danger" onPress={() => {
                  setConfirm({
                    open: true,
                    title: 'Hapus checklist?',
                    message: 'Tindakan ini tidak dapat dibatalkan.',
                    onConfirm: async () => {
                      try { await fetch(`/api/checklists/${g.id}`, { method: 'DELETE', credentials: 'include' }); toast.success('Checklist dihapus'); } catch { toast.error('Gagal menghapus'); }
                      setChecklists((arr)=>arr.filter((x)=>x.id!==g.id));
                    }
                  });
                }}>Hapus</Button>}
              </div>
              <div className="mt-2">
                <Progress aria-label="progress" value={percent} className="max-w-full" />
              </div>
              {!isViewer && (
                <div className="mt-2">
                  <Input
                    variant="bordered"
                    placeholder="Add an item"
                    value={newItem[g.id] || ""}
                    onValueChange={(val)=>setNewItem((m)=>({ ...m, [g.id]: val }))}
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <Button size="sm" color="primary" onPress={()=>addChecklistItem(g.id)} startContent={<FiPlus />}>Add</Button>
                    <Button size="sm" variant="light" onPress={()=>setNewItem((m)=>({ ...m, [g.id]: "" }))}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-2">
                {g.items.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox size="sm" isSelected={c.done} onValueChange={async (checked)=>{
                      setChecklists((arr)=>arr.map(gr=>gr.id===g.id?{...gr, items: gr.items.map(it=>it.id===c.id?{...it, done:checked}:it)}:gr));
                      try { await fetch(`/api/checklist-items/${c.id}`, { method:'PATCH', credentials:'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ done: checked }) }); } catch {}
                    }} isDisabled={isViewer} />
                    <div className="flex-1">
                      <Input
                        variant="bordered"
                        size="sm"
                        value={c.title}
                        isReadOnly={isViewer}
                        onValueChange={(val)=>{
                          setChecklists((arr)=>arr.map(gr=>gr.id===g.id?{...gr, items: gr.items.map(it=>it.id===c.id?{...it, title:val}:it)}:gr));
                          try { clearTimeout(itemTimers.current[c.id]); } catch {}
                          itemTimers.current[c.id] = setTimeout(async ()=>{
                            try { await fetch(`/api/checklist-items/${c.id}`, { method:'PATCH', credentials:'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: val }) }); } catch {}
                          }, 500);
                        }}
                        onBlur={async ()=>{ try { clearTimeout(itemTimers.current[c.id]); await fetch(`/api/checklist-items/${c.id}`, { method:'PATCH', credentials:'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: c.title }) }); } catch {} }}
                      />
                    </div>
                    {!isViewer && (
                      <Button size="sm" variant="light" color="danger" onPress={() => {
                        setConfirm({
                          open: true,
                          title: 'Hapus item checklist?',
                          message: 'Item akan dihapus permanen.',
                          onConfirm: async () => {
                            try { await fetch(`/api/checklist-items/${c.id}`, { method:'DELETE', credentials:'include' }); toast.success('Item dihapus'); } catch { toast.error('Gagal menghapus'); }
                            setChecklists((arr)=>arr.map(gr=>gr.id===g.id?{...gr, items: gr.items.filter(it=>it.id!==c.id)}:gr));
                          }
                        });
                      }}>Hapus</Button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <AttachmentsSection
          attachments={attachments}
          isViewer={isViewer}
          onOpenPreview={(a)=>{ const isImage = a.type?.startsWith('image/'); const isPdf = a.type==='application/pdf'||(a.url||'').toLowerCase().endsWith('.pdf'); if (isImage||isPdf) setPreview({ open: true, att: a }); else window.open(a.url, '_blank', 'noopener,noreferrer'); }}
          onDelete={(id)=> setConfirm({ open:true, title:'Hapus lampiran?', message:'File/link akan dihapus dari task ini.', onConfirm: async ()=>{ try { await deleteAttachment(id); toast.success('Lampiran dihapus'); } catch { toast.error('Gagal menghapus'); } } })}
        />
      </div>

      <div>
        <CommentsSection
          me={me}
          isViewer={isViewer}
          comment={comment}
          setComment={setComment}
          comments={comments}
          onSubmit={async ()=>{ await submitComment(); try{ const r=await fetch(`/api/comments?taskId=${task.id}`, { credentials:'include' }); const d=await r.json(); setComments(d.comments||[]);}catch{} }}
          onDelete={deleteComment}
          onPasteFile={(f)=>addAttachmentFile(f)}
        />
      </div>
    </div>

    <Modal isOpen={checklistModal} onOpenChange={setChecklistModal}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Tambah daftar periksa</ModalHeader>
            <div className="grid gap-3">
              <Input autoFocus label="Judul" variant="bordered" value={checklistTitle} onValueChange={setChecklistTitle} />
              <div className="flex justify-end gap-2">
                <Button variant="light" onPress={() => setChecklistModal(false)}>Batal</Button>
                <Button color="primary" onPress={addChecklistGroup}>Tambah</Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Members Modal */}
    <Modal isOpen={memberModal} onOpenChange={setMemberModal}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Anggota</ModalHeader>
            <Input placeholder="Cari anggota" value={memberQuery} onValueChange={setMemberQuery} className="mb-3" />
            <div className="overflow-y-auto overflow-x-hidden pb-20 max-h-80 no-scrollbar space-y-2">
              {members
                .filter((u)=> u.role !== 'VIEWER')
                .filter((u)=> u.username.toLowerCase().includes(memberQuery.toLowerCase()) || (u.name??'').toLowerCase().includes(memberQuery.toLowerCase()))
                .map((u)=>(
                  <label key={u.id} className="flex items-center justify-between shadow rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name ?? u.username} size="sm" />
                      <span>{u.name ? `${u.name}` : u.username}</span>
                    </div>
                    <Checkbox isSelected={selectedMemberIds.has(u.id)} onValueChange={(val)=>{
                      setSelectedMemberIds(prev=>{ const s=new Set(prev); if(val) s.add(u.id); else s.delete(u.id); return s; });
                    }} />
                  </label>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="light" onPress={()=>setMemberModal(false)}>Tutup</Button>
              <Button color="primary" onPress={async ()=>{
                const currentIds = new Set((task.assignees||[]).map(a=>a.id));
                // Add newly selected
                for (const id of Array.from(selectedMemberIds)) {
                  if (!currentIds.has(id)) {
                    await fetch(`/api/tasks/${task.id}/assignees`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId:id })});
                  }
                }
                // Remove unchecked
                for (const id of Array.from(currentIds)) {
                  if (!selectedMemberIds.has(id)) {
                    await fetch(`/api/tasks/${task.id}/assignees`, { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId:id })});
                  }
                }
                // Update local assignees for immediate UI feedback
                const nextIds = Array.from(selectedMemberIds);
                const nextAssignees = nextIds
                  .map((id)=> members.find((m)=>m.id===id))
                  .filter(Boolean)
                  .map((m)=> ({ id: m!.id, name: m!.name, username: m!.username }));
                setAssigneesLocal(nextAssignees as any);
                setMemberModal(false);
                onChanged();
              }}>Terapkan</Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Attachment Modal (stage then save) */}
    <Modal isOpen={attachModal} onOpenChange={setAttachModal}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Lampirkan</ModalHeader>
            <div className="space-y-4">
              <div>
                <p className="text-tiny text-default-500 mb-1">Lampirkan berkas dari komputer Anda</p>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]||null; setPendingFile(f); }} />
                <Button onPress={()=>fileInputRef.current?.click()}>Pilih berkas</Button>
                {pendingFile && <p className="text-tiny mt-1">Dipilih: {pendingFile.name}</p>}
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-1">Cari atau tempel tautan</p>
                <Input placeholder="Cari tautan terbaru atau tempel tautan baru" value={pendingLink} onValueChange={setPendingLink} />
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-1">Teks tampilan (opsional)</p>
                <Input placeholder="Teks untuk ditampilkan" value={pendingDisplay} onValueChange={setPendingDisplay} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="light" onPress={()=>{ setAttachModal(false); setPendingFile(null); setPendingLink(""); setPendingDisplay(""); }}>Batal</Button>
                <Button color="primary" onPress={async ()=>{ if(pendingFile){ await addAttachmentFile(pendingFile); } else if(pendingLink.trim()){ await addAttachmentLink(pendingLink.trim(), pendingDisplay.trim()||undefined); } setAttachModal(false); setPendingFile(null); setPendingLink(""); setPendingDisplay(""); }}>Simpan</Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Attachment Preview Modal */}
    <Modal isOpen={preview.open} onOpenChange={(o)=>setPreview((p)=>({ ...p, open: o }))} size="3xl">
      <ModalContent>
        {() => (
          <div className="p-4">
            <ModalHeader className="p-0 mb-3">{preview.att?.name}</ModalHeader>
            {preview.att ? (
              preview.att.type?.startsWith('image/') ? (
                <img src={preview.att.url} alt={preview.att.name} className="max-h-[75vh] w-full object-contain" />
              ) : (preview.att.type === 'application/pdf' || (preview.att.url||'').toLowerCase().endsWith('.pdf')) ? (
                <iframe src={preview.att.url} className="w-full h-[75vh]" />
              ) : (
                <p className="text-sm text-default-500">Preview tidak tersedia untuk tipe ini. <a className="text-primary" href={preview.att.url} target="_blank" rel="noreferrer">Buka di tab baru</a>.</p>
              )
            ) : null}
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Confirm Modal */}
    <Modal isOpen={confirm.open} onOpenChange={(o)=>setConfirm((p)=>({ ...p, open: o }))}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">{confirm.title || 'Konfirmasi'}</ModalHeader>
            {confirm.message ? <p className="text-sm text-default-500">{confirm.message}</p> : null}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="light" onPress={()=>setConfirm({ open:false, title:'', message:'', onConfirm:null })}>Batal</Button>
              <Button color="danger" onPress={async ()=>{ try { await confirm.onConfirm?.(); } finally { setConfirm({ open:false, title:'', message:'', onConfirm:null }); } }}>Hapus</Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Labels Modal with improved UX */}
    <Modal isOpen={labelModal} onOpenChange={setLabelModal}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Label</ModalHeader>
            <Input placeholder="Cari label..." value={labelQuery} onValueChange={setLabelQuery} className="mb-3" />
            <div className="space-y-2 mb-4">
              {allLabels
                .filter(l=> l.name.toLowerCase().includes(labelQuery.toLowerCase()))
                .map((l)=>(
                  <div key={l.id} className="flex items-center justify-between px-2 py-1 rounded-md border border-default-200">
                    <span className="text-sm">{l.name}</span>
                    {!isViewer && (
                      l.selected ? (
                        <Button size="sm" variant="light" color="danger" onPress={async ()=>{
                          try { await fetch(`/api/tasks/${task.id}/labels`, { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ labelId: l.id }) }); setAllLabels((arr)=>arr.map(x=>x.id===l.id?{...x, selected:false}:x)); onChanged(); } catch {}
                        }}>Lepas</Button>
                      ) : (
                        <Button size="sm" variant="light" onPress={async ()=>{
                          try { await fetch(`/api/tasks/${task.id}/labels`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ labelId: l.id }) }); setAllLabels((arr)=>arr.map(x=>x.id===l.id?{...x, selected:true}:x)); onChanged(); } catch {}
                        }}>Tambah</Button>
                      )
                    )}
                  </div>
                ))}
            </div>
            {/* Create new label UX */}
            {(!isViewer) && (
              <div className="mt-2">
                {!showCreateLabel && allLabels.length > 0 ? (
                  <Button size="sm" variant="bordered" onPress={()=>setShowCreateLabel(true)}>Tambah label baru</Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input aria-label="Nama label baru" placeholder="Nama label baru" value={newLabelName} onValueChange={setNewLabelName} variant="bordered" className="flex-1" />
                    <Button isIconOnly color="primary" aria-label="Simpan label" onPress={async ()=>{
                      const name = newLabelName.trim();
                      if(!name) return;
                      try {
                        await fetch(`/api/tasks/${task.id}/labels`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
                        setNewLabelName("");
                        try { const r = await fetch(`/api/tasks/${task.id}/labels`, { credentials:'include' }); const d = await r.json(); setAllLabels(d.labels||[]); } catch {}
                        onChanged();
                        if (allLabels.length > 0) setShowCreateLabel(false);
                      } catch {}
                    }}>
                      <FiSave />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="light" onPress={()=>setLabelModal(false)}>Tutup</Button>
              <Button color="primary" onPress={async ()=>{ try{ const r=await fetch(`/api/tasks/${task.id}/labels`, { credentials:'include' }); const d=await r.json(); setAllLabels(d.labels||[]);}catch{} onChanged(); setLabelModal(false); }}>Simpan</Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>

    {/* Dates Modal */}
    <Modal isOpen={dateModal} onOpenChange={setDateModal}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Dates</ModalHeader>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox isSelected={startEnabled} onValueChange={setStartEnabled} />
                  Start date
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={startDate.split('T')[0]||''} onChange={(e)=>setStartDate(e.target.value + (startDate.includes('T')? ('T'+startDate.split('T')[1]) : 'T00:00'))} disabled={!startEnabled} />
                  <Input type="time" value={startDate.split('T')[1]?.slice(0,5)||''} onChange={(e)=>setStartDate((startDate.split('T')[0]||new Date().toISOString().slice(0,10)) + 'T' + e.target.value)} disabled={!startEnabled} />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultSelected isReadOnly />
                  Due date
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={due.split('T')[0]||''} onChange={(e)=>setDue(e.target.value + (due.includes('T')? ('T'+due.split('T')[1]) : 'T12:00'))} />
                  <Input type="time" value={due.split('T')[1]?.slice(0,5)||''} onChange={(e)=>setDue((due.split('T')[0]||new Date().toISOString().slice(0,10)) + 'T' + e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="light" onPress={()=>setDateModal(false)}>Close</Button>
                <Button color="primary" onPress={async ()=>{ await saveDue(due); setDateModal(false); }}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>  
  </>
  );
}

function Column({ data, onAdd, onOpen }: { data: ColumnData; onAdd: (colId: string, title: string) => void; onOpen: (task: Task, col: ColumnData) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const { setNodeRef } = useDroppable({ id: data.id });
  const formRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className="flex h-full w-72 sm:w-63 flex-col rounded-2xl border border-default-200 bg-content1 p-3">
      <div className="flex items-center gap-3">
        <h3 className="text-small font-semibold text-default-600">
          {data.title}
          <span className="ml-2 rounded-full bg-default-100 px-2 py-0.5 text-tiny text-default-600">
            {data.tasks.length}
          </span>
        </h3>
        <div className={`h-1 flex-1 rounded-full ${data.accent ?? ""}`} />
      </div>
      <SortableContext items={data.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          {data.tasks.map((t) => (
            <TaskCard key={t.id} {...t} is_complete={data.title === 'Complete'} onOpen={() => onOpen(t, data)} />
          ))}
        </div>
      </SortableContext>
      <div className="pt-2">
        {adding ? (
          <div ref={formRef} className="flex items-center gap-2">
              <Input
                autoFocus
                size="sm"
                variant="bordered"
                placeholder="Judul tugas"
                value={text}
                onValueChange={setText}
              onBlur={(e) => {
                const next = (e as any).relatedTarget as Node | null;
                if (formRef.current && next && formRef.current.contains(next)) {
                  return; // keep open when moving focus to the Add button
                }
                setTimeout(() => {
                  setAdding(false);
                  setText("");
                }, 10);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) {
                  onAdd(data.id, text.trim());
                  setText("");
                  setAdding(false);
                }
                if (e.key === "Escape") { setText(""); setAdding(false); }
              }}
            />
            <Button
              size="sm"
              color="primary"
              isDisabled={!text.trim()}
              onPress={() => {
                if (!text.trim()) return;
                onAdd(data.id, text.trim());
                setText("");
                setAdding(false);
              }}
            >
              Tambah
              </Button>
          </div>
        ) : (
          <Button fullWidth size="sm" variant="flat" startContent={<FiPlus />} onPress={() => setAdding(true)}>
            New Task
          </Button>
        )}
      </div>
    </div>
  );
}

export default function WorkspaceBoardPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { columns, load, addTask, moveTask, replaceColumns, workspaceRole } = useBoard();
  const { items: workspaces, fetch: fetchWorkspaces } = useWorkspaces();
  const currentWorkspace = useMemo(() => workspaces.find((w) => w.slug === slug) || null, [workspaces, slug]);

  useEffect(() => {
    if (slug) {
      load(slug);
    }
  }, [slug, load]);

  useEffect(() => {
    if (!currentWorkspace) {
      try { fetchWorkspaces(); } catch {}
    }
  }, [currentWorkspace, fetchWorkspaces]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list'|'table'|'report'>('list');
  const [tableQuery, setTableQuery] = useState("");
  const [sortKey, setSortKey] = useState<null | 'status' | 'due'>(null);
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const rows = useMemo(() => columns.flatMap((c)=> (c.tasks||[]).map((t)=>({ task: t, column: c }))), [columns]);
  const filteredSortedRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    let arr = rows.filter(({ task, column }) => {
      if (!q) return true;
      const inTitle = task.title.toLowerCase().includes(q);
      const inStatus = column.title.toLowerCase().includes(q);
      const inLabels = (task.tags||[]).some(l => (l.name||'').toLowerCase().includes(q));
      return inTitle || inStatus || inLabels;
    });
    if (sortKey === 'status') {
      arr = arr.slice().sort((a,b)=>{
        const cmp = a.column.title.localeCompare(b.column.title);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else if (sortKey === 'due') {
      arr = arr.slice().sort((a,b)=>{
        const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const cmp = ad - bd;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return arr;
  }, [rows, tableQuery, sortKey, sortDir]);

  const handleSort = (key: 'status'|'due') => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  const [reportMembers, setReportMembers] = useState<{ id: string; username: string; name: string | null }[]>([]);
  useEffect(() => {
    if (viewMode !== 'report') return;
    const cached = __membersCache.get(slug);
    if (cached) {
      setReportMembers(cached.map(m=>({ id:m.id, username:m.username, name:m.name })));
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/members`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const mem = (data.members||[]).map((m:any)=>({ id:m.user.id, username:m.user.username, name:m.user.name }));
          setReportMembers(mem);
          // seed cache for TaskDetail reuse
          try { __membersCache.set(slug, (data.members||[]).map((m:any)=>({ ...m.user, role: m.role }))); } catch {}
        }
      } catch {}
    })();
  }, [slug, viewMode]);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const t = columns.flatMap((c) => c.tasks).find((x) => x.id === id) || null;
    setActiveTask(t);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const cols = columns;
    const fromColIndex = cols.findIndex((c) => c.tasks.some((t) => t.id === activeId));
    if (fromColIndex === -1) return;
    let toColIndex = cols.findIndex((c) => c.tasks.some((t) => t.id === overId));
    if (toColIndex === -1) {
      toColIndex = cols.findIndex((c) => c.id === overId);
      if (toColIndex === -1) return;
    }
    const fromCol = cols[fromColIndex];
    const toCol = cols[toColIndex];
    const fromIdx = fromCol.tasks.findIndex((t) => t.id === activeId);
    if (fromColIndex === toColIndex) {
      let overIdx = toCol.tasks.findIndex((t) => t.id === overId);
      if (overIdx === -1) overIdx = toCol.tasks.length - 1;
      if (fromIdx === -1 || overIdx === -1) return;
      const newTasks = arrayMove(toCol.tasks, fromIdx, overIdx);
      const nextCols = [...cols];
      nextCols[fromColIndex] = { ...toCol, tasks: newTasks };
      replaceColumns(nextCols);
      moveTask(activeId, toCol.id, overIdx);
      return;
    }
    const overIdx = toCol.tasks.findIndex((t) => t.id === overId);
    const insertIdx = overIdx >= 0 ? overIdx : toCol.tasks.length;
    const task = fromCol.tasks[fromIdx];
    if (!task) return;
    const fromTasks = [...fromCol.tasks];
    fromTasks.splice(fromIdx, 1);
    const toTasks = [...toCol.tasks];
    toTasks.splice(insertIdx, 0, task);
    const nextCols = [...cols];
    nextCols[fromColIndex] = { ...fromCol, tasks: fromTasks };
    nextCols[toColIndex] = { ...toCol, tasks: toTasks };
    replaceColumns(nextCols);
    moveTask(activeId, toCol.id, insertIdx);
  };

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ task: Task; column: { title: string; accent?: string | null } } | null>(null);
  const openTask = (task: Task, col: ColumnData) => { setSelected({ task, column: { title: col.title, accent: col.accent ?? null } }); setOpen(true); };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<{ id: string; username: string; name: string | null; role?: string }[]>([]);
  const [currentMembers, setCurrentMembers] = useState<{ id: string; username: string; name: string | null; role: 'ADMIN'|'MEMBER'|'VIEWER' }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Record<string, "ADMIN"|"MEMBER"|"VIEWER">>({});
  const loadAvailableUsers = async () => {
    try {
      // fetch users (first page, 100 items), then filter to user.role === 'MEMBER'
      const res = await fetch(`/api/users?page=1&pageSize=100&q=${encodeURIComponent(userQuery)}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.users||[]) as any[];
      const wsRes = await fetch(`/api/workspaces/${slug}/members`, { credentials: 'include' });
      let memberIds = new Set<string>();
      if (wsRes.ok) {
        const d = await wsRes.json();
        const cur = (d.members||[]).map((m:any)=> ({ id:m.user.id, username:m.user.username, name:m.user.name||null, role: m.role }));
        setCurrentMembers(cur);
        memberIds = new Set<string>(cur.map((x:any)=>x.id));
      }
      const filtered = list
        // Exclude user-level ADMIN entirely; allow others (including legacy null) to appear
        .filter((u:any) => u.role !== 'ADMIN')
        .filter((u:any) => !memberIds.has(u.id));
      setAvailableUsers(filtered.map(u=>({ id:u.id, username:u.username, name:u.name||null, role:u.role })));
    } catch {}
  };

  return (
    <div className="flex h-[calc(100dvh-64px-48px)] min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between py-2 px-2 sm:px-0">
        <div className="flex flex-row gap-5">
          <div>
            <p className="text-tiny text-default-500">Workspace / {currentWorkspace?.name ?? slug}</p>
            <h1 className="text-2xl font-semibold">{currentWorkspace?.name ?? slug}</h1>
          </div>

          <div className="w-48">
            <Select
              className="max-w-xs"
              variant="bordered"
              label="Tampilan tugas"
              selectedKeys={new Set([viewMode])}
              onSelectionChange={(keys)=>{ try { const k = Array.from(keys as Set<string>)[0] as any; setViewMode((k||'list') as any); } catch {} }}
            >
              <SelectItem key="list" startContent={<FiList />}>Daftar</SelectItem>
              <SelectItem key="table" startContent={<FiTable />}>Tabel</SelectItem>
              <SelectItem key="report" startContent={<FiFile />}>Laporan</SelectItem>
            </Select>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {workspaceRole === "ADMIN" && (
            <div className="flex gap-2 items-center">
              <Button color="primary" variant="bordered" endContent={<FiPlus />} onPress={() => { setAddMembersOpen(true); loadAvailableUsers(); }}>Atur Member</Button>
              <Button color="danger" variant="bordered" endContent={<FiTrash2 />} onPress={() => setConfirmOpen(true)}>Hapus</Button>
            </div>
          )}
        </div>
      </header>

      {viewMode === 'list' ? (
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex h-full min-w-full gap-4 pb-2 pr-2">
              {columns.map((col) => (
                <div key={col.id} className="flex h-full min-h-0 flex-col">
                  <Column data={col} onAdd={addTask} onOpen={(t) => openTask(t, col)} />
                </div>
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
              {activeTask ? (
                <div className="pointer-events-none select-none">
                  <Card shadow="lg" className="w-72 sm:w-63 border border-default-200 bg-content1/95 shadow-2xl ring-1 ring-default-200/60 rotate-2 scale-[1.03]">
                    {activeTask.tags && activeTask.tags.length > 0 ? (
                      <div className="px-4 pt-3">
                        <div className="flex -space-x-2">
                          {activeTask.tags.slice(0, 3).map((tg) => (
                            <span key={tg.id} className="inline-flex items-center rounded-full bg-default-200 text-default-700 px-2 py-0.5 text-tiny ring-2 ring-background">
                              {tg.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <CardBody className="gap-3">
                      <p className="font-medium text-default-800">{activeTask.title}</p>
                      {typeof activeTask.progress === "number" && (
                        <Progress aria-label="progress" value={activeTask.progress} color={activeTask.progress >= 100 ? "success" : "warning"} className="max-w-full" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {(activeTask.assignees ?? []).slice(0, 3).map((a) => (
                            <Avatar key={a.id} size="sm" name={a.name ?? a.username} className="ring-2 ring-background" />
                          ))}
                        </div>
                        {formatDaysLeft(activeTask.dueDate) ? (
                          <span className="text-tiny text-default-500">{formatDaysLeft(activeTask.dueDate)}</span>
                        ) : null}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex flex-col gap-2 min-h-0 overflow-auto">
          <Input size="sm" className="w-56" variant="bordered" placeholder="Cari tugas tabel..." value={tableQuery} onValueChange={setTableQuery} />
          <Table aria-label="Tugas di workspace" removeWrapper isStriped>
            <TableHeader>
              <TableColumn>Tugas</TableColumn>
              <TableColumn>
                <button type="button" className="font-semibold hover:underline cursor-pointer" onClick={()=>handleSort('status')}>
                  Status {sortKey==='status' ? (sortDir==='asc' ? '▲' : '▼') : ''}
                </button>
              </TableColumn>
              <TableColumn>Anggota</TableColumn>
              <TableColumn>
                <button type="button" className="font-semibold hover:underline cursor-pointer" onClick={()=>handleSort('due')}>
                  Jatuh Tempo {sortKey==='due' ? (sortDir==='asc' ? '▲' : '▼') : ''}
                </button>
              </TableColumn>
              <TableColumn>Label</TableColumn>
              <TableColumn>Aksi</TableColumn>
            </TableHeader>
            <TableBody emptyContent={filteredSortedRows.length ? undefined : 'Tidak ada tugas'}>
              {filteredSortedRows.map(({ task, column }) => (
                <TableRow key={task.id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{column.title}</TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {(task.assignees ?? []).slice(0, 3).map((a) => (
                        <Avatar key={a.id} size="sm" name={a.name ?? a.username} className="ring-2 ring-background" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <div className="flex flex-col">
                        <span>{new Date(task.dueDate).toLocaleString()}</span>
                        <span className="text-tiny text-default-500">{formatDaysLeft(task.dueDate)}</span>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(task.tags ?? []).slice(0,3).map((tg) => (
                        <span key={tg.id} className="inline-flex items-center rounded-full bg-default-200 text-default-700 px-2 py-0.5 text-tiny">
                          {tg.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="flat" onPress={() => openTask(task, column)}>Buka</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-default-200 rounded-xl p-3 bg-content1">
              <p className="font-medium mb-2">Data per Status</p>
              {(() => {
                const lbls = columns.map(c=>c.title);
                const counts = columns.map(c=> (c.tasks||[]).length);
                const maxVal = counts.length ? Math.max(...counts) : 0;
                const yMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
                const data = { labels: lbls, datasets: [{ label: 'Jumlah Tugas', data: counts, backgroundColor: '#3b82f6' }] } as any;
                const options = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero:true, max: yMax, ticks: { stepSize: 1, precision: 0, callback: (v:any)=> (Number.isInteger(v)? v : '') } } } } as any;
                return <Bar data={data} options={options} />;
              })()}
            </div>
            <div className="border border-default-200 rounded-xl p-3 bg-content1">
              <p className="font-medium mb-2">Data per Label</p>
              {(() => {
                const map = new Map<string, number>();
                columns.forEach(c=> (c.tasks||[]).forEach(t=> (t.tags||[]).forEach(l=> map.set(l.name, (map.get(l.name)||0)+1))));
                const lbls = Array.from(map.keys());
                const counts = Array.from(map.values());
                const maxVal = counts.length ? Math.max(...counts) : 0;
                const yMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
                const data = { labels: lbls, datasets: [{ label: 'Jumlah Tugas', data: counts, backgroundColor: '#10b981' }] } as any;
                const options = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero:true, max: yMax, ticks: { stepSize: 1, precision: 0, callback: (v:any)=> (Number.isInteger(v)? v : '') } } } } as any;
                return lbls.length ? <Bar data={data} options={options} /> : <p className="text-default-500">Belum ada label.</p>;
              })()}
            </div>
            <div className="border border-default-200 rounded-xl p-3 bg-content1">
              <p className="font-medium mb-2">Data per Anggota</p>
              {(() => {
                // seed dari semua anggota workspace (termasuk yang 0 tugas)
                const seed = new Map<string, { label: string, count: number }>();
                (reportMembers||[]).forEach(m=>{ const label = m.name || m.username; if(label) seed.set(m.id, { label, count: 0 }); });
                columns.forEach(c=> (c.tasks||[]).forEach(t=> (t.assignees||[]).forEach(a=> {
                  if (!a.id) return;
                  if (!seed.has(a.id)) { const label = a.name || a.username || a.id; seed.set(a.id, { label, count: 0 }); }
                  const v = seed.get(a.id)!; v.count += 1; seed.set(a.id, v);
                })));
                const lbls = Array.from(seed.values()).map(v=>v.label);
                const counts = Array.from(seed.values()).map(v=>v.count);
                const maxVal = counts.length ? Math.max(...counts) : 0;
                const yMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
                const data = { labels: lbls, datasets: [{ label: 'Jumlah Tugas', data: counts, backgroundColor: '#f59e0b' }] } as any;
                const options = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero:true, max: yMax, ticks: { stepSize: 1, precision: 0, callback: (v:any)=> (Number.isInteger(v)? v : '') } } } } as any;
                return lbls.length ? <Bar data={data} options={options} /> : <p className="text-default-500">Belum ada penugasan.</p>;
              })()}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={open} onOpenChange={setOpen} size="5xl">
        <ModalContent>
          {() => (
            <TaskDetail
              task={selected?.task || null}
              columnTitle={selected?.column.title || ""}
              columnAccent={selected?.column.accent}
              slug={slug}
              role={workspaceRole}
              onClose={() => setOpen(false)}
              onChanged={() => { /* realtime via SSE; no hard reload */ }}
            />
          )}
        </ModalContent>
      </Modal>
      <Modal isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <ModalContent>
          {() => (
            <div className="p-6">
              <ModalHeader className="p-0 mb-2">Hapus Workspace</ModalHeader>
              <p className="text-small text-default-600">Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus workspace ini?</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="light" onPress={() => setConfirmOpen(false)}>Batal</Button>
                <Button color="danger" onPress={async () => {
                  try {
                    const res = await fetch(`/api/workspaces/${slug}`, { method: 'DELETE', credentials: 'include' });
                    if (!res.ok) throw new Error('Failed');
                    setConfirmOpen(false);
                    // refresh sidebar workspaces immediately
                    try { useWorkspaces.getState().fetch(); } catch {}
                    router.push('/admin/dashboard');
                  } catch {
                    setConfirmOpen(false);
                  }
                }}>Hapus</Button>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
      {/* Atur Member Modal */}
      <Modal size="xl" isOpen={addMembersOpen} onOpenChange={(o)=>{ setAddMembersOpen(o); if (!o) { setSelectedUserIds(new Set()); setSelectedRoles({}); setUserQuery(""); } }}>
        <ModalContent>
          {() => (
            <div className="p-6">
              <ModalHeader className="p-0 mb-3">Atur Anggota Workspace</ModalHeader>
              <div className="space-y-5">
                <div>
                  <p className="text-small text-default-500 mb-2">Anggota saat ini</p>
                  <div className="space-y-2 max-h-64 overflow-auto no-scrollbar">
                    {currentMembers.map((m)=> (
                      <div key={m.id} className="flex gap-8 items-center justify-between border border-default-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name || m.username} size="sm" />
                          <div className="leading-tight">
                            <p className="text-small font-medium">{m.name || m.username}</p>
                            <p className="text-tiny text-default-500">{m.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-46">
                          <Select size="sm" className="max-w-xs" selectedKeys={[m.role]} onSelectionChange={async (k)=>{
                            try {
                              const role = Array.from(k)[0] as 'ADMIN'|'MEMBER'|'VIEWER';
                              await fetch(`/api/workspaces/${slug}/members`, { method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: m.id, role }) });
                              setCurrentMembers(list=> list.map(x=> x.id===m.id ? { ...x, role } : x));
                              toast.success('Role diperbarui');
                              try { useBoard.getState().load(slug); } catch {}
                            } catch {
                              toast.error('Gagal memperbarui role');
                            }
                          }}>
                            <SelectItem key="ADMIN">ADMIN</SelectItem>
                            <SelectItem key="MEMBER">MEMBER</SelectItem>
                            <SelectItem key="VIEWER">VIEWER</SelectItem>
                          </Select>
                          <Button size="sm" color="danger" variant="flat" onPress={async ()=>{
                            try {
                              await fetch(`/api/workspaces/${slug}/members`, { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: m.id }) });
                              const taskIds: string[] = [];
                              try { (columns||[]).forEach(c=> (c.tasks||[]).forEach(t=> { if ((t.assignees||[]).some(a=>a.id===m.id)) taskIds.push(t.id); })); } catch {}
                              for (const tid of taskIds) {
                                await fetch(`/api/tasks/${tid}/assignees`, { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: m.id }) });
                              }
                              setCurrentMembers(list=> list.filter(x=> x.id!==m.id));
                              toast.success('Anggota dihapus');
                              try { useBoard.getState().load(slug); } catch {}
                            } catch {
                              toast.error('Gagal menghapus anggota');
                            }
                          }}>Hapus</Button>
                        </div>
                      </div>
                    ))}
                    {(!currentMembers || currentMembers.length===0) && (
                      <p className="text-small text-default-500">Belum ada anggota.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Input placeholder="Cari user (username/nama)" value={userQuery} onValueChange={(v)=>{ setUserQuery(v); }} className="max-w-sm" />
                  <Button variant="flat" onPress={loadAvailableUsers}>Cari</Button>
                </div>
                <div className="max-h-80 overflow-auto no-scrollbar space-y-2">
                  {availableUsers
                    .filter(u=> u.username.toLowerCase().includes(userQuery.toLowerCase()) || (u.name||'').toLowerCase().includes(userQuery.toLowerCase()))
                    .map((u)=> {
                      const checked = selectedUserIds.has(u.id);
                      return (
                        <div key={u.id} className="flex items-center justify-between border border-default-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name || u.username} size="sm" />
                            <div className="leading-tight">
                              <p className="text-small font-medium">{u.name || u.username}</p>
                              <p className="text-tiny text-default-500">{u.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {checked && (
                              <Select aria-label={`Role untuk ${u.username}`} size="sm" selectedKeys={[selectedRoles[u.id] || 'MEMBER']} onSelectionChange={(k)=>{
                                const v = Array.from(k)[0] as 'ADMIN'|'MEMBER'|'VIEWER';
                                setSelectedRoles(prev=> ({ ...prev, [u.id]: v }));
                              }} className="min-w-[150px]">
                                <SelectItem key="ADMIN">ADMIN</SelectItem>
                                <SelectItem key="MEMBER">MEMBER</SelectItem>
                                <SelectItem key="VIEWER">VIEWER</SelectItem>
                              </Select>
                            )}
                            <Checkbox isSelected={checked} onValueChange={(val)=>{
                              setSelectedUserIds(prev=>{ const s=new Set(prev); if(val) { s.add(u.id); if(!selectedRoles[u.id]) setSelectedRoles(r=>({...r,[u.id]:'MEMBER'})); } else { s.delete(u.id); setSelectedRoles(r=>{ const x={...r}; delete x[u.id]; return x; }); } return s; });
                            }}>{checked ? 'Dipilih' : 'Pilih'}</Checkbox>
                          </div>
                        </div>
                      );
                    })}
                  {(!availableUsers || availableUsers.length === 0) && (
                    <p className="text-small text-default-500">Tidak ada user yang dapat ditambahkan.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="light" onPress={()=>{ setAddMembersOpen(false); }}>Tutup</Button>
                  <Button color="primary" onPress={async ()=>{
                    try {
                      const ids = Array.from(selectedUserIds);
                      if (ids.length) {
                        await Promise.all(ids.map(async (id)=>{
                          const u = availableUsers.find(x=>x.id===id);
                          if (!u) return;
                          const role = selectedRoles[id] || 'MEMBER';
                          await fetch(`/api/workspaces/${slug}/members`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ usernameOrEmail: u.username, role }) });
                        }));
                      }
                      toast.success(ids.length? 'Anggota ditambahkan' : 'Selesai');
                      await loadAvailableUsers();
                      load(slug)
                      setAddMembersOpen(false);
                      setSelectedUserIds(new Set());
                      setSelectedRoles({});
                      try { useWorkspaces.getState().fetch(); } catch {}
                      try { useBoard.getState().load(slug); } catch {}
                    } catch {
                      toast.error('Gagal menyimpan perubahan');
                    }
                  }}>Simpan</Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>

    </div>
  );
}
