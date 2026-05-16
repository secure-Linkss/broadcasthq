"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Bell, CheckCheck, AlertTriangle, TrendingDown, Zap, Info } from "lucide-react";
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

interface AppNotification {
  id: string;
  type: "warning" | "info" | "error" | "success";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  action?: { label: string; href: string };
}

const TYPE_CONFIG: Record<AppNotification["type"], { icon: React.ReactNode; color: string; dot: string }> = {
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500", dot: "bg-yellow-500" },
  error:   { icon: <TrendingDown className="h-4 w-4" />, color: "text-red-500",    dot: "bg-red-500"    },
  info:    { icon: <Info className="h-4 w-4" />,         color: "text-blue-500",   dot: "bg-blue-500"   },
  success: { icon: <Zap className="h-4 w-4" />,          color: "text-green-500",  dot: "bg-green-500"  },
};

function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/notifications")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setNotifications(
        (d.notifications ?? []).map((n: Omit<AppNotification, "isRead">) => ({ ...n, isRead: false }))
      ))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = notifications.filter(n => !n.isRead).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  const markRead    = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {!loading && unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-2xl" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {!loading && unread > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary/15 text-primary border-primary/30" variant="outline">
                {unread} new
              </Badge>
            )}
          </div>
          {!loading && unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
              <p className="text-xs text-muted-foreground/60 mt-1">All clear — no alerts in the past 7 days</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(notif => {
                const cfg = TYPE_CONFIG[notif.type];
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${!notif.isRead ? "bg-primary/5" : ""}`}
                    onClick={() => markRead(notif.id)}
                  >
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                        {notif.action && (
                          <a
                            href={notif.action.href}
                            className="text-[11px] text-primary font-medium hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {notif.action.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-7" asChild>
            <a href="/settings">Manage notification preferences</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const currentSegment = segments[segments.length - 1] || "dashboard";
  const title = currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
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
