import AdminSidebar from "@/components/admin/sidebar";
import { AdminMobileMenu } from "@/components/admin/mobile-menu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <div className="sticky hidden h-[calc(100vh-6rem)] md:block">
        <AdminSidebar />
      </div>
      <section className="min-w-0 min-h-0 flex-1">
        <div className="md:hidden pt-2">
          <AdminMobileMenu />
        </div>
        {children}
      </section>
    </div>
  );
}
