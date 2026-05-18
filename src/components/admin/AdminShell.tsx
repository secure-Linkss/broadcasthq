"use client";

import { useState } from "react";
import { AdminNav } from "./AdminNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ShieldAlert } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <AdminNav />
      </div>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r border-border">
          <AdminNav onClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6 bg-card">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20 shrink-0">
              SUPER ADMIN
            </span>
            <ShieldAlert className="sm:hidden h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Restricted access area</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
