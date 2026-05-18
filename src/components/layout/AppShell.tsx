"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function Shell({ children }: { children: React.ReactNode }) {
  const { open, close } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar — Sheet drawer */}
      <Sheet open={open} onOpenChange={o => !o && close()}>
        <SheetContent side="left" className="p-0 w-64 border-r border-border">
          <Sidebar onClose={close} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
