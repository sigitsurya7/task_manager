"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Divider } from "@heroui/divider";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeSwitch } from "../theme-switch";
import { FiLayout, FiUsers, FiCheckSquare, FiZap, FiChevronLeft, FiChevronRight, FiPlus, FiSettings, FiShield, FiUserCheck, FiSmartphone, FiShoppingCart, FiTrendingUp, FiActivity, FiAirplay, FiAperture, FiArchive, FiBarChart2, FiBook, FiBriefcase, FiCalendar, FiCamera, FiCode, FiDatabase, FiFeather, FiFileText, FiFolder, FiGlobe, FiGrid, FiHeart, FiHome, FiInbox, FiLayers, FiMail, FiMap, FiMonitor, FiPackage, FiPaperclip, FiPieChart, FiServer, FiTarget, FiTool } from "react-icons/fi";
import { Logo } from "../icons";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { api } from "@/lib/axios";
import { toast } from "react-hot-toast";

type Item = { label: string; href: string; icon?: React.ReactNode };
import { useWorkspaces } from "@/stores/workspaces";

const baseMenu: Item[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <FiLayout /> },
  { label: "Tugas Saya", href: "/admin/tasks", icon: <FiCheckSquare /> },
];

// icons map by key coming from server
const iconMap: Record<string, React.ReactNode> = {
  FiZap: <FiZap />,
  FiLayout: <FiLayout />,
  FiUsers: <FiUsers />,
  FiCheckSquare: <FiCheckSquare />,
  FiSmartphone: <FiSmartphone />,
  FiShoppingCart: <FiShoppingCart />,
  FiTrendingUp: <FiTrendingUp />,
  FiActivity: <FiActivity />,
  FiAirplay: <FiAirplay />,
  FiAperture: <FiAperture />,
  FiArchive: <FiArchive />,
  FiBarChart2: <FiBarChart2 />,
  FiBook: <FiBook />,
  FiBriefcase: <FiBriefcase />,
  FiCalendar: <FiCalendar />,
  FiCamera: <FiCamera />,
  FiCode: <FiCode />,
  FiDatabase: <FiDatabase />,
  FiFeather: <FiFeather />,
  FiFileText: <FiFileText />,
  FiFolder: <FiFolder />,
  FiGlobe: <FiGlobe />,
  FiGrid: <FiGrid />,
  FiHeart: <FiHeart />,
  FiHome: <FiHome />,
  FiInbox: <FiInbox />,
  FiLayers: <FiLayers />,
  FiMail: <FiMail />,
  FiMap: <FiMap />,
  FiMonitor: <FiMonitor />,
  FiPackage: <FiPackage />,
  FiPaperclip: <FiPaperclip />,
  FiPieChart: <FiPieChart />,
  FiServer: <FiServer />,
  FiTarget: <FiTarget />,
  FiTool: <FiTool />,
};
const iconOptions = Object.keys(iconMap);

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const { items, fetch } = useWorkspaces();
  useEffect(() => { fetch(); }, [fetch]);
  const viewerOnly = useMemo(() => items.length > 0 && items.every((w) => w.role === "VIEWER"), [items]);
  const menuItems = baseMenu;
  const workspaces = useMemo<Item[]>(() =>
    items.map((w) => ({ label: w.name, href: `/admin/workspace/${w.slug}`, icon: iconMap[w.iconKey || "FiZap"] })),
  [items]);

  const isAnyAdmin = useMemo(() => items.some((w) => w.role === "ADMIN"), [items]);

  // current user + role summary
  const [me, setMe] = useState<{ username: string; name?: string } | null>(null);
  const roleBadge = useMemo(() => {
    const priority: Record<string, number> = { VIEWER: 1, MEMBER: 2, ADMIN: 3 };
    const top = [...items].sort((a, b) => (priority[b.role] || 0) - (priority[a.role] || 0))[0]?.role || "";
    return top ? top.charAt(0) + top.slice(1).toLowerCase() : "";
  }, [items]);
  useEffect(() => {
    (async () => {
      try { const res = await api.get('/api/auth/me'); setMe(res.data.user ?? null); } catch {}
    })();
  }, []);

  // Add Workspace Modal state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>("FiZap");
  const [users, setUsers] = useState<{ id: string; username: string; email: string; name: string | null }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const nameInvalid = submitAttempted && name.trim() === "";

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleCreate = async () => {
    setSubmitAttempted(true);
    if (!name.trim()) return;
    try {
      const slug = slugify(name);
      await api.post("/api/workspaces", { name: name.trim(), slug, iconKey });
      const picked = Array.from(selectedMembers);
      if (picked.length) {
        await Promise.all(
          picked.map((uid) => {
            const u = users.find((x) => x.id === uid);
            if (!u) return Promise.resolve();
            return api.post(`/api/workspaces/${slug}/members`, { usernameOrEmail: u.username, role: "MEMBER" }).catch(() => null);
          }),
        );
      }
      setOpen(false);
      setName("");
      setIconKey("FiZap");
      setSelectedMembers(new Set());
      setSubmitAttempted(false);
      fetch();
      toast.success("Workspace dibuat");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal membuat workspace");
    }
  };

  // load registered users when modal opens
  useEffect(() => {
    (async () => {
      if (!open) return;
      try {
        const res = await api.get('/api/users');
        setUsers(res.data.users ?? []);
      } catch (e) {
        // ignore
      }
    })();
  }, [open]);

  const NavList = ({ title, items, buttons }: { title: string; items: Item[]; buttons: boolean; }) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="flex justify-between items-center">
          <p className="px-2 text-xs uppercase tracking-wide text-default-400">
            {title}
          </p>

          {buttons && (
              <Button color="primary" size="sm" startContent={<FiPlus />} onPress={() => setOpen(true)}>
                Add
              </Button>
            )}
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-label={item.label}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-50/10 dark:text-primary"
                  : "text-default-600 hover:bg-default-100",
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <aside
      className={clsx(
        "h-full shrink-0 rounded-2xl border border-default-200 bg-content1 transition-[width,padding] flex flex-col",
        collapsed ? "w-16 p-3" : "w-64 p-4",
      )}
    >
      <div className="flex items-center gap-3 px-1 py-1">
        {collapsed ? (
          <></>
        ) : (
          <>
            <Avatar
              name={me?.username || "U"}
              className="bg-gradient-to-tr from-primary to-secondary text-white"
              size="sm"
            />
            <div className="leading-tight">
              <p className="text-small font-semibold">{me?.username || "Pengguna"}</p>
              <p className="text-tiny text-default-500">{roleBadge}</p>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2 items-center">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="menu"
            onPress={() => setCollapsed((v) => !v)}
            endContent={collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          >
          </Button>
        </div>
      </div>

      <Divider className="my-3" />

      <div className="space-y-5">
        <NavList title="Menu" items={menuItems} buttons={false} />
        <NavList title="Workspaces" items={workspaces} buttons={isAnyAdmin} />
        {isAnyAdmin && (
          <NavList
            title="Admin"
            buttons={false}
            items={[
              { label: "ACL", href: "/admin/settings/acl", icon: <FiShield /> },
              { label: "Roles", href: "/admin/settings/roles", icon: <FiSettings /> },
              { label: "User Management", href: "/admin/settings/users", icon: <FiUserCheck /> },
            ]}
          />
        )}
      </div>

      {/* Bottom settings */}
      <div className="mt-auto pt-3">
        <Divider className="my-3" />
        <Popover placement="top-start">
          <PopoverTrigger>
            <button
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors",
                "text-default-600 hover:bg-default-100",
              )}
              aria-label="Pengaturan"
            >
              <span className="text-lg shrink-0"><FiSettings /></span>
              {!collapsed && <span className="truncate">Pengaturan</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="">
            <div className="flex flex-col gap-1">
              <button
                className="text-left rounded-md px-2 py-1 hover:bg-default-100"
                onClick={() => (window.location.href = "/admin/settings/account")}
              >
                Pengaturan Akun
              </button>
              <Divider />
              <button
                className="text-left rounded-md px-2 py-1 text-danger hover:bg-danger-100/40"
                onClick={async () => {
                  await toast.promise(api.post('/api/auth/logout'), {
                    loading: 'Logging out...',
                    success: 'Logged out',
                    error: 'Gagal keluar',
                  });
                  window.location.href = "/login";
                }}
              >
                Keluar
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Add Workspace Modal */}
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          {() => (
            <div className="p-5">
              <ModalHeader className="p-0 mb-4">Tambah Workspace</ModalHeader>
              <div className="grid gap-3">
                <Input
                  label="Nama Workspace"
                  variant="bordered"
                  value={name}
                  onValueChange={setName}
                  isInvalid={nameInvalid}
                  errorMessage={nameInvalid ? "Nama wajib diisi" : undefined}
                  classNames={{ inputWrapper: nameInvalid ? "animate-shake" : undefined }}
                />
                <Select
                  label="Ikon (React Icons Fi)"
                  selectedKeys={[iconKey]}
                  onSelectionChange={(k) => setIconKey(Array.from(k)[0] as string)}
                >
                  {iconOptions.map((key) => (
                    <SelectItem key={key} value={key} startContent={<span className="text-lg">{iconMap[key]}</span>}>
                      {key}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Members (opsional)"
                  selectionMode="multiple"
                  selectedKeys={selectedMembers}
                  onSelectionChange={(keys) => setSelectedMembers(new Set(keys as any))}
                  description="Pilih dari user yang terdaftar"
                >
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} aria-label={u.username}>
                      {u.name}
                    </SelectItem>
                  ))}
                </Select>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="light" onPress={() => { setOpen(false); setSubmitAttempted(false); }}>Batal</Button>
                  <Button color="primary" onPress={handleCreate}>Buat</Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </aside>
  );
}
