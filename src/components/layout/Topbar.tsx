"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Search, Bell, CheckCheck, Ticket, Megaphone, Info, AlertTriangle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

interface DBNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  ticket_created:   { icon: <Ticket className="h-4 w-4" />,       color: "text-blue-500"   },
  ticket_replied:   { icon: <Ticket className="h-4 w-4" />,       color: "text-green-500"  },
  ticket_resolved:  { icon: <Ticket className="h-4 w-4" />,       color: "text-green-600"  },
  campaign_complete:{ icon: <Megaphone className="h-4 w-4" />,    color: "text-primary"    },
  system:           { icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500" },
};

function NotificationCenter() {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [open, setOpen]                   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {!loading && unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))] p-0 shadow-2xl" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {!loading && unreadCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary/15 text-primary border-primary/30" variant="outline">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {!loading && unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(notif => {
                const cfg = TYPE_ICON[notif.type] ?? TYPE_ICON.system;
                const inner = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer",
                      !notif.isRead && "bg-primary/5"
                    )}
                    onClick={() => markRead(notif.id)}
                  >
                    <div className={cn("mt-0.5 shrink-0", cfg.color)}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium leading-tight", !notif.isRead ? "text-foreground" : "text-muted-foreground")}>
                          {notif.title}
                        </p>
                        {!notif.isRead && <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
                return notif.href ? (
                  <Link key={notif.id} href={notif.href}>{inner}</Link>
                ) : (
                  <div key={notif.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border px-4 py-2.5">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-7" asChild>
            <Link href="/help?tab=tickets">View all tickets</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Page title from pathname
function usePageTitle(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const segment  = segments[segments.length - 1] || "dashboard";
  return segment.charAt(0).toUpperCase() + segment.replace(/-/g, " ").slice(1);
}

export function Topbar() {
  const pathname = usePathname();
  const title    = usePageTitle(pathname);
  const { toggle } = useSidebar();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={toggle}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base md:text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts, campaigns..."
            className="w-64 bg-muted/50 pl-9 focus-visible:bg-background"
          />
        </div>

        <NotificationCenter />
      </div>
    </header>
  );
}
