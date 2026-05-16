"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Megaphone,
  CreditCard,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  Ban,
  Bot,
  Webhook,
  Shield,
  Activity,
  Brain,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Overview",      href: "/admin/dashboard",   icon: LayoutDashboard },
  { name: "Intelligence",  href: "/admin/analytics",   icon: Brain },
  { name: "Security",      href: "/admin/security",    icon: Shield },
  { name: "System Health", href: "/admin/system",      icon: Activity },
  { name: "Users",         href: "/admin/users",       icon: Users },
  { name: "Workspaces",    href: "/admin/workspaces",  icon: Building2 },
  { name: "Campaigns",     href: "/admin/campaigns",   icon: Megaphone },
  { name: "Billing",       href: "/admin/billing",     icon: CreditCard },
  { name: "Opt-outs",      href: "/admin/optouts",     icon: Ban },
  { name: "Bot Blocks",    href: "/admin/bot-blocks",  icon: Bot },
  { name: "Webhooks",      href: "/admin/webhooks",    icon: Webhook },
  { name: "Settings",      href: "/admin/settings",    icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">Admin Panel</p>
          <p className="text-xs text-muted-foreground">BroadcastHQ</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-destructive" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to App
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
