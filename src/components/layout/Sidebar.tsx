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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  { name: "Team",     href: "/team",     icon: Building2, roles: null },
  { name: "Billing",  href: "/billing",  icon: CreditCard, roles: ["owner", "admin", "super_admin"] },
  { name: "Settings", href: "/settings", icon: Settings,   roles: null },
  { name: "Help",     href: "/help",     icon: HelpCircle, roles: null },
];

function NavItem({
  item,
  pathname,
  onClose,
}: {
  item: { name: string; href: string; icon: React.ElementType; roles?: string[] | null };
  pathname: string;
  onClose?: () => void;
}) {
  const isActive = pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClose}
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

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const userRole = session?.user?.role ?? "";
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.avatarUrl) setAvatarUrl(d.user.avatarUrl); })
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    fetch("/api/workspace")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.workspace?.name) setWorkspaceName(d.workspace.name); })
      .catch(() => {});
  }, [session?.user?.workspaceId]);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex flex-col justify-center px-5 pt-4 pb-3 shrink-0 min-h-[72px]">
        <Logo size="sm" href="/dashboard" />
        <AnimatePresence>
          {workspaceName && (
            <motion.div
              key={workspaceName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-1.5 ml-[38px] flex items-center gap-1.5"
            >
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase leading-none">for</span>
              <span className="text-[11px] font-semibold text-primary truncate max-w-[140px] leading-none">{workspaceName}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {/* Main nav */}
        <nav className="space-y-0.5 px-3">
          {mainNavItems.map(item => (
            <NavItem key={item.name} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </nav>

        {/* Tools section */}
        <div className="mt-6">
          <h3 className="mb-1.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </h3>
          <nav className="space-y-0.5 px-3">
            {toolsNavItems.map(item => (
              <NavItem key={item.name} item={item} pathname={pathname} onClose={onClose} />
            ))}
          </nav>
        </div>

        {/* Workspace section */}
        <div className="mt-6">
          <h3 className="mb-1.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </h3>
          <nav className="space-y-0.5 px-3">
            {secondaryNavItems
              .filter(item => !item.roles || item.roles.includes(userRole))
              .map(item => (
                <NavItem key={item.name} item={item} pathname={pathname} onClose={onClose} />
              ))}
          </nav>
        </div>

        {/* Admin Panel — super_admin only */}
        {isSuperAdmin && (
          <div className="mt-6 px-3">
            <div className="h-px bg-border mb-3" />
            <Link
              href="/admin/dashboard"
              onClick={onClose}
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
      <div className="border-t border-border p-4 space-y-1 shrink-0">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={session?.user?.name ?? "avatar"} />}
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
