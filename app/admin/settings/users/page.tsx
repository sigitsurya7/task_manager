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

type User = { id: string; email: string; username: string; name: string | null; role: "ADMIN" | "MEMBER"; createdAt: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  // User management now uses only User table (no workspace scope)

  const load = async () => {
    try {
      const res = await api.get(`/api/users?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q)}`);
      const list = (res.data.users ?? []).map((u: any) => ({ ...u, role: u.role || "MEMBER" }));
      setUsers(list);
      setTotalPages(res.data.totalPages ?? 1);
      // no workspace fetch
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal memuat users");
    }
  };

  useEffect(() => { load(); }, [page, pageSize, q]);

  // no workspace member loading

  // Add/Edit modal state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "">("");

  const resetForm = () => {
    setEditId(null);
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setSubmitAttempted(false);
    setRole("MEMBER");
  };

  const openAdd = () => { resetForm(); setOpen(true); };
  const openEdit = (u: User) => {
    setEditId(u.id);
    setName(u.name ?? "");
    setEmail(u.email);
    setUsername(u.username);
    setPassword("");
    setSubmitAttempted(false);
    setRole((u.role as any) || "MEMBER");
    setOpen(true);
  };

  const emailInvalid = submitAttempted && email.trim() === "";
  const usernameInvalid = submitAttempted && username.trim() === "";
  const passwordInvalid = submitAttempted && !editId && password.trim() === ""; // password wajib saat create
  const roleInvalid = submitAttempted && (!role);

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (!email.trim() || !username.trim() || (!editId && !password.trim())) return;
    try {
      if (!editId) {
        const createRes = await api.post("/api/users", { name: name || null, email, username, password, role: role || "MEMBER" });
        toast.success("User dibuat");
      } else {
        await api.patch(`/api/users/${editId}`, { name: name || null, email, username, password: password || undefined, role: role || undefined });
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
          <div className="flex items-center gap-3">
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
              <TableColumn>Role</TableColumn>
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
                      selectedKeys={[(u.role as any) || "MEMBER"]}
                      onSelectionChange={async (k) => {
                        const newKey = Array.from(k)[0] as "ADMIN" | "MEMBER";
                        try {
                          await api.patch(`/api/users/${u.id}`, { role: newKey });
                          setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: newKey } : x)));
                          toast.success("Role diperbarui");
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message ?? "Gagal memperbarui role");
                        }
                      }}
                      className="min-w-[160px]"
                    >
                      <SelectItem key="ADMIN">ADMIN</SelectItem>
                      <SelectItem key="MEMBER">MEMBER</SelectItem>
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
                <Select
                  aria-label="Role user"
                  label="Role"
                  selectedKeys={role ? [role] : []}
                  onSelectionChange={(k) => setRole(Array.from(k)[0] as any)}
                  isInvalid={roleInvalid}
                  className="max-w-xs"
                >
                  <SelectItem key="ADMIN">ADMIN</SelectItem>
                  <SelectItem key="MEMBER">MEMBER</SelectItem>
                </Select>
                <div className="flex justify-between gap-2 mt-2">
                  {editId ? (
                    <Button
                      variant="flat"
                      color="danger"
                      onPress={async ()=>{
                        try {
                          await api.delete(`/api/users/${editId}`);
                          toast.success('User dihapus');
                          setOpen(false);
                          resetForm();
                          load();
                        } catch (e:any) {
                          toast.error(e?.response?.data?.message ?? 'Gagal menghapus user');
                        }
                      }}
                    >Hapus User</Button>
                  ) : <span />}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="light" onPress={() => { setOpen(false); resetForm(); }}>Batal</Button>
                    <Button color="primary" onPress={onSubmit}>{editId ? "Simpan" : "Tambah"}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* workspace-specific role removal modal removed */}
    </div>
  );
}

