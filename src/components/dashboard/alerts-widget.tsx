"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Snowflake, Star, X, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  detail: string;
  action?: { label: string; href: string };
}

const TYPE_STYLES: Record<Alert["type"], { border: string; iconColor: string; icon: React.ReactNode }> = {
  critical: { border: "border-l-red-500",    iconColor: "text-red-500",    icon: <TrendingDown className="h-4 w-4" /> },
  warning:  { border: "border-l-yellow-500", iconColor: "text-yellow-500", icon: <Snowflake className="h-4 w-4" />  },
  info:     { border: "border-l-blue-500",   iconColor: "text-blue-500",   icon: <Star className="h-4 w-4" />       },
};

export function AlertsWidget() {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/alerts")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setAlerts(d.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismiss = (id: string) => setAlerts(prev => prev.filter(a => a.id !== id));

  if (!loading && alerts.length === 0) return null;

  return (
    <Card className="bg-card border-border/50 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Smart Alerts
          {!loading && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5 h-5">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 hidden sm:flex">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : (
          alerts.map(alert => {
            const styles = TYPE_STYLES[alert.type];
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg bg-muted/30 border-l-2 ${styles.border} group`}
              >
                <span className={`shrink-0 mt-0.5 ${styles.iconColor}`}>{styles.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {alert.action && (
                    <Link href={alert.action.href}>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary">
                        {alert.action.label} <ChevronRight className="ml-0.5 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    onClick={() => dismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
