"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { FiPlus } from "react-icons/fi";
import { api } from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Select, SelectItem } from "@heroui/select";
import { Pagination } from "@heroui/pagination";

type User = { id: string; email: string; username: string; name: string | null; createdAt: string };

type Ws = { id: string; name: string; slug: string; role: "ADMIN" | "MEMBER" | "VIEWER" };
type Member = { id: string; role: "ADMIN" | "MEMBER" | "VIEWER"; user: { id: string } };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [workspaces, setWorkspaces] = useState<Ws[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    try {
      const res = await api.get(`/api/users?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q)}`);
      setUsers(res.data.users ?? []);
      setTotalPages(res.data.totalPages ?? 1);
      const ws = await api.get("/api/workspaces");
      const adminWs: Ws[] = (ws.data.workspaces ?? []).filter((w: Ws) => w.role === "ADMIN");
      setWorkspaces(adminWs);
      if (!selectedSlug && adminWs.length) setSelectedSlug(adminWs[0].slug);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal memuat users");
    }
  };

  useEffect(() => { load(); }, [page, pageSize, q]);

  // load members for selected workspace
  useEffect(() => {
    (async () => {
      if (!selectedSlug) return;
      try {
        setLoading(true);
        const res = await api.get(`/api/workspaces/${selectedSlug}/members`);
        setMembers(res.data.members ?? []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? "Gagal memuat role anggota");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedSlug]);

  // Add/Edit modal state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER" | "">("");
  const [confirm, setConfirm] = useState<{ open: boolean; username: string; userId: string } | null>(null);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setSubmitAttempted(false);
    setRole("");
  };

  const openAdd = () => { resetForm(); setOpen(true); };
  const openEdit = (u: User) => {
    setEditId(u.id);
    setName(u.name ?? "");
    setEmail(u.email);
    setUsername(u.username);
    setPassword("");
    setSubmitAttempted(false);
    setOpen(true);
  };

  const emailInvalid = submitAttempted && email.trim() === "";
  const usernameInvalid = submitAttempted && username.trim() === "";
  const passwordInvalid = submitAttempted && !editId && password.trim() === ""; // password wajib saat create
  const roleInvalid = submitAttempted && !editId && (!role || !selectedSlug);

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (!email.trim() || !username.trim() || (!editId && !password.trim())) return;
    try {
      if (!editId) {
        const createRes = await api.post("/api/users", { name: name || null, email, username, password });
        // set role in selected workspace if chosen
        if (selectedSlug && role) {
          await api.post(`/api/workspaces/${selectedSlug}/members`, { usernameOrEmail: username, role });
        }
        toast.success("User dibuat");
      } else {
        await api.patch(`/api/users/${editId}`, { name: name || null, email, username, password: password || undefined });
        toast.success("User diperbarui");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan user");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">User Management</h1>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Pilih workspace"
              selectedKeys={selectedSlug ? [selectedSlug] : []}
              onSelectionChange={(k) => setSelectedSlug(Array.from(k)[0] as string)}
              size="sm"
              className="min-w-[200px]"
            >
              {workspaces.map((w) => (
                <SelectItem key={w.slug}>{w.name}</SelectItem>
              ))}
            </Select>
            <Input size="sm" placeholder="Search users..." value={q} onValueChange={(v)=>{ setQ(v); setPage(1); }} className="w-56" />
            <Button color="primary" startContent={<FiPlus />} onPress={openAdd}>Add</Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Users table" removeWrapper>
            <TableHeader>
              <TableColumn>Nama</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Username</TableColumn>
              <TableColumn>Role ({selectedSlug ?? '-'})</TableColumn>
              <TableColumn>Aksi</TableColumn>
            </TableHeader>
            <TableBody emptyContent={users.length ? undefined : "Tidak ada user"}>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name ?? "-"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Select
                      aria-label={`Role ${u.username}`}
                      size="sm"
                      selectedKeys={[
                        members.find((m) => m.user.id === u.id)?.role ?? ("NONE" as any),
                      ]}
                      onSelectionChange={async (k) => {
                        const newKey = Array.from(k)[0] as "ADMIN" | "MEMBER" | "VIEWER" | "NONE";
                        if (!selectedSlug) return;
                        if (newKey === "NONE") {
                          // Use modal confirmation instead of alert
                          setConfirm({ open: true, username: u.username, userId: u.id });
                          return;
                        }
                        try {
                          const exists = members.find((m) => m.user.id === u.id);
                          if (exists) {
                            await api.patch(`/api/workspaces/${selectedSlug}/members`, { userId: u.id, role: newKey });
                            setMembers((mm) => mm.map((m) => (m.user.id === u.id ? { ...m, role: newKey } : m)));
                          } else {
                            await api.post(`/api/workspaces/${selectedSlug}/members`, { usernameOrEmail: u.username, role: newKey });
                            setMembers((mm) => [...mm, { id: crypto.randomUUID(), role: newKey, user: { id: u.id } }]);
                          }
                          toast.success("Role diperbarui");
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message ?? "Gagal memperbarui role");
                        }
                      }}
                      className="min-w-[160px]"
                    >
                      <SelectItem key="NONE">— Tidak ada —</SelectItem>
                      <SelectItem key="ADMIN">ADMIN</SelectItem>
                      <SelectItem key="MEMBER">MEMBER</SelectItem>
                      <SelectItem key="VIEWER">VIEWER</SelectItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="flat" onPress={() => openEdit(u)}>Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end items-center gap-3 mt-3">
            <Pagination page={page} total={totalPages} onChange={setPage} showControls size="sm" />
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          {() => (
            <div className="p-6">
              <ModalHeader className="p-0 mb-4">{editId ? "Edit User" : "Add User"}</ModalHeader>
              <div ref={formRef} className="grid grid-cols-1 gap-4">
                <Input label="Nama" variant="bordered" value={name} onValueChange={setName} />
                <Input
                  label="Email"
                  variant="bordered"
                  value={email}
                  onValueChange={setEmail}
                  isInvalid={emailInvalid}
                  errorMessage={emailInvalid ? "Email wajib diisi" : undefined}
                  classNames={{ inputWrapper: emailInvalid ? "animate-shake" : undefined }}
                />
                <Input
                  label="Username"
                  variant="bordered"
                  value={username}
                  onValueChange={setUsername}
                  isInvalid={usernameInvalid}
                  errorMessage={usernameInvalid ? "Username wajib diisi" : undefined}
                  classNames={{ inputWrapper: usernameInvalid ? "animate-shake" : undefined }}
                />
                <Input
                  label="Password"
                  variant="bordered"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                  isInvalid={passwordInvalid}
                  errorMessage={passwordInvalid ? "Password wajib diisi" : undefined}
                  classNames={{ inputWrapper: passwordInvalid ? "animate-shake" : undefined }}
                />
                {!editId && (
                  <Select
                    aria-label="Role untuk workspace terpilih"
                    label={`Role ${selectedSlug ?? ''}`}
                    selectedKeys={role ? [role] : []}
                    onSelectionChange={(k) => setRole(Array.from(k)[0] as any)}
                    isInvalid={roleInvalid}
                    className="max-w-xs"
                  >
                    <SelectItem key="ADMIN">ADMIN</SelectItem>
                    <SelectItem key="MEMBER">MEMBER</SelectItem>
                    <SelectItem key="VIEWER">VIEWER</SelectItem>
                  </Select>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="light" onPress={() => { setOpen(false); resetForm(); }}>Batal</Button>
                  <Button color="primary" onPress={onSubmit}>{editId ? "Simpan" : "Tambah"}</Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Confirm remove role modal */}
      <Modal isOpen={!!confirm?.open} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <ModalContent>
          {() => (
            <div className="p-6">
              <ModalHeader className="p-0 mb-2">Hapus Role</ModalHeader>
              <p className="text-small text-default-600">
                Apakah Anda yakin ingin menghapus role <span className="font-medium">{confirm?.username}</span> dari workspace ini?
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="light" onPress={() => setConfirm(null)}>Batal</Button>
                <Button color="danger" onPress={async () => {
                  if (!confirm || !selectedSlug) return;
                  try {
                    await api.delete(`/api/workspaces/${selectedSlug}/members`, { data: { userId: confirm.userId } });
                    setMembers((mm) => mm.filter((m) => m.user.id !== confirm.userId));
                    setConfirm(null);
                    toast.success("Role dihapus dari workspace");
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message ?? "Gagal menghapus role");
                  }
                }}>Hapus</Button>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

