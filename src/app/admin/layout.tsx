import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { title: "Admin — BroadcastHQ" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <AdminNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-border px-6 bg-card">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
              SUPER ADMIN
            </span>
            <span className="text-sm text-muted-foreground">Restricted access area</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
