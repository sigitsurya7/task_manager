"use client";

import { useState, useMemo } from "react";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Divider } from "@heroui/divider";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeSwitch } from "../theme-switch";
import {
  FiLayout,
  FiUsers,
  FiCheckSquare,
  FiZap,
  FiSmartphone,
  FiShoppingCart,
  FiTrendingUp,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiPlayCircle,
  FiPlus,
} from "react-icons/fi";
import { Logo } from "../icons";

type Item = { label: string; href: string; icon?: React.ReactNode };

const baseMenu: Item[] = [
  { label: "Dashboard", href: "/admin", icon: <FiLayout /> },
  { label: "People", href: "/admin/people", icon: <FiUsers /> },
  { label: "My Tasks", href: "/admin/tasks", icon: <FiCheckSquare /> },
];

const baseWorkspaces: Item[] = [
  { label: "Web Design", href: "/admin", icon: <FiZap /> },
  // { label: "Mobile App", href: "/admin/mobile", icon: <FiSmartphone /> },
  // { label: "Ecommerce", href: "/admin/ecommerce", icon: <FiShoppingCart /> },
  // { label: "Digital Marketing", href: "/admin/marketing", icon: <FiTrendingUp /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = useMemo(() => baseMenu, []);
  const workspaces = useMemo(() => baseWorkspaces, []);

  const NavList = ({ title, items, buttons }: { title: string; items: Item[]; buttons: boolean; }) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="flex justify-between items-center">
          <p className="px-2 text-xs uppercase tracking-wide text-default-400">
            {title}
          </p>

          {buttons && (
              <Button color="primary" size="sm" startContent={<FiPlus />}>
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
        "h-full shrink-0 rounded-2xl border border-default-200 bg-content1 transition-[width,padding]",
        collapsed ? "w-16 p-3" : "w-64 p-4",
      )}
    >
      <div className="flex items-center gap-3 px-1 py-1">
        {collapsed ? (
          <></>
        ) : (
          <>
            <Avatar
              name="D"
              className="bg-gradient-to-tr from-primary to-secondary text-white"
              size="sm"
            />
            <div className="leading-tight">
              <p className="text-small font-semibold">Dayily</p>
              <p className="text-tiny text-default-500">Workspace</p>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2 items-center">
          {!collapsed && <ThemeSwitch />}
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
        <NavList title="Workspaces" items={workspaces} buttons={true} />
      </div>
    </aside>
  );
}
