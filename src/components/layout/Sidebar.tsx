"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  CreditCard,
  Building2,
  HelpCircle,
  MessageCircleCode,
  ShieldAlert,
  LogOut,
  Radio,
  PhoneCall,
  Ban,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mainNavItems = [
  { name: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { name: "Campaigns",  href: "/campaigns",  icon: Radio },
  { name: "Contacts",   href: "/contacts",   icon: Users },
  { name: "Templates",  href: "/templates",  icon: MessageCircleCode },
  { name: "Analytics",  href: "/analytics",  icon: BarChart3 },
  { name: "Inbox",      href: "/inbox",      icon: MessageSquare },
];

const toolsNavItems = [
  { name: "Validator",  href: "/tools/validator", icon: PhoneCall },
  { name: "Opt-outs",   href: "/tools/optouts",   icon: Ban },
];

const secondaryNavItems = [
  { name: "Team",     href: "/team",     icon: Building2 },
  { name: "Billing",  href: "/billing",  icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help",     href: "/help",     icon: HelpCircle },
];

function NavItem({ item, pathname }: { item: { name: string; href: string; icon: React.ElementType }; pathname: string }) {
  const isActive = pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
      {item.name}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center px-5">
        <Logo size="sm" href="/dashboard" />
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {/* Main nav */}
        <nav className="space-y-0.5 px-3">
          {mainNavItems.map(item => (
            <NavItem key={item.name} item={item} pathname={pathname} />
          ))}
        </nav>

        {/* Tools section */}
        <div className="mt-6">
          <h3 className="mb-1.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </h3>
          <nav className="space-y-0.5 px-3">
            {toolsNavItems.map(item => (
              <NavItem key={item.name} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        {/* Workspace section */}
        <div className="mt-6">
          <h3 className="mb-1.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </h3>
          <nav className="space-y-0.5 px-3">
            {secondaryNavItems.map(item => (
              <NavItem key={item.name} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        {/* Admin Panel — super_admin only */}
        {isSuperAdmin && (
          <div className="mt-6 px-3">
            <div className="h-px bg-border mb-3" />
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              )}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Admin Panel
            </Link>
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-border p-4 space-y-1">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <span className="truncate text-sm font-medium text-foreground">
              {session?.user?.name ?? "Loading…"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {session?.user?.email ?? ""}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
