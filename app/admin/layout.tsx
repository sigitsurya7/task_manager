import AdminSidebar from "@/components/admin/sidebar";
import { AdminMobileMenu } from "@/components/admin/mobile-menu";
import NotificationBell from "@/components/admin/notification-bell";
import { RegisterSW } from "@/components/pwa/register-sw";
import InstallButton from "@/components/pwa/install-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <RegisterSW />
      <div className="sticky hidden h-[calc(100vh-6rem)] md:block">
        <AdminSidebar />
      </div>
      <section className="min-w-0 min-h-0 flex-1">
        <div className="md:hidden pt-2">
          <AdminMobileMenu />
        </div>
        {children}
      </section>

      {/* Notifikasi realtime & tombol instal PWA */}
      <NotificationBell />
      <InstallButton />
    </div>
  );
}
