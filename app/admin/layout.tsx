import AdminSidebar from "@/components/admin/sidebar";

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
      <section className="min-w-0 min-h-0 flex-1">{children}</section>
    </div>
  );
}
