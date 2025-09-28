"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Drawer, DrawerContent } from "@heroui/drawer";
import { FiMenu, FiX } from "react-icons/fi";
import AdminSidebar from "@/components/admin/sidebar";

export function AdminMobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden -mt-2 mb-2">
      <Button
        isIconOnly
        variant="flat"
        aria-label="Buka menu"
        onPress={() => setOpen(true)}
      >
        <FiMenu />
      </Button>

      <Drawer hideCloseButton isOpen={open} onOpenChange={setOpen} placement="left">
        <DrawerContent className="w-[18rem] max-w-[80vw] p-0 bg-content1 shadow-2xl [&_[data-slot=close-button]]:hidden">
          {() => (
            <div className="relative h-full overflow-y-auto">
              <button
                aria-label="Tutup menu"
                className="absolute right-2 top-2 z-10 rounded-full p-2 text-default-500 hover:bg-default-100"
                onClick={() => setOpen(false)}
              >
                <FiX />
              </button>
              <div className="pt-2 pb-3 px-2">
                <AdminSidebar variant="mobile" />
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
