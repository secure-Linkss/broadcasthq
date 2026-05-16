"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Send,
  Megaphone,
  CheckCircle2,
  MessageSquare,
  Upload,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  id: string;
  type: "contact_added" | "message_sent" | "campaign_launched" | "campaign_completed" | "reply_received" | "import_done";
  title: string;
  meta: string;
  timestamp: string;
}

const EVENT_CONFIG: Record<ActivityEvent["type"], { icon: React.ReactNode; color: string; bg: string }> = {
  contact_added:      { icon: <UserPlus className="h-3.5 w-3.5" />,    color: "text-blue-500",   bg: "bg-blue-500/15"   },
  message_sent:       { icon: <Send className="h-3.5 w-3.5" />,         color: "text-primary",    bg: "bg-primary/15"    },
  campaign_launched:  { icon: <Megaphone className="h-3.5 w-3.5" />,    color: "text-yellow-500", bg: "bg-yellow-500/15" },
  campaign_completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-500",  bg: "bg-green-500/15"  },
  reply_received:     { icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-purple-500", bg: "bg-purple-500/15" },
  import_done:        { icon: <Upload className="h-3.5 w-3.5" />,        color: "text-cyan-500",   bg: "bg-cyan-500/15"   },
};

export function ActivityFeed() {
  const [events, setEvents]   = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/activity")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="bg-card border-border/50 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Live Activity
          <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-green-500/10 text-green-500 border-green-500/30 animate-pulse">
            LIVE
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 hidden sm:flex">
          View all <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 pb-2.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No recent activity in the past 7 days.</p>
        ) : (
          events.map((event, idx) => {
            const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.message_sent;
            return (
              <div key={event.id} className="flex items-start gap-3 py-2.5 group">
                <div className="flex flex-col items-center shrink-0 mt-0.5">
                  <div className={`h-7 w-7 rounded-full ${cfg.bg} ${cfg.color} flex items-center justify-center`}>
                    {cfg.icon}
                  </div>
                  {idx < events.length - 1 && (
                    <div className="w-px flex-1 bg-border/40 mt-1 min-h-[8px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2.5">
                  <p className="text-sm font-medium text-foreground leading-tight">{event.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{event.meta}</span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
